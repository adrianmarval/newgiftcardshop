'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/payment/binance.service';
import prisma from '@/lib/prisma';
import { PaymentDirection, PaymentCategory, PaymentStatus } from '@/generated/prisma/client';
import { syncPendingSellerPayments } from '@/lib/services/payment/seller-payout.service';
import { syncWithdrawalsOutputSchema } from './schemas';

export const syncPendingWithdrawals = adminActionClient
  .outputSchema(syncWithdrawalsOutputSchema)
  .action(async () => {
    // ── 1. Sync admin withdrawals (existing logic) ──────────────────────────

    const pendingAdminWithdrawals = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        category: PaymentCategory.WITHDRAWAL,
        direction: PaymentDirection.DEBIT,
        transactionId: { not: null },
      },
    });

    const results = {
      total: 0,
      resolved: 0,
      failed: 0,
      stillPending: 0,
      errors: [] as string[],
      sellerPayouts: { total: 0, resolved: 0, failed: 0, stillPending: 0, errors: [] as string[] },
    };

    if (pendingAdminWithdrawals.length > 0) {
      const syncResults = await Promise.all(
        pendingAdminWithdrawals.map(async (payment) => {
          try {
            const history = await binance.getWithdrawHistory({
              withdrawOrderId: payment.transactionId!,
            });

            if (!history || history.length === 0) {
              return { type: 'stillPending' };
            }

            const record = history[0];

            if (record.status === 6) {
              await prisma.$transaction(async (tx) => {
                const platformSettings = await tx.platformSettings.upsert({
                  where: { key: 'platformBalance' },
                  update: { balance: { decrement: payment.amount } },
                  create: { key: 'platformBalance', value: '0', balance: payment.amount.negated() },
                });

                await tx.payment.update({
                  where: { id: payment.id },
                  data: {
                    status: PaymentStatus.COMPLETED,
                    balanceAfter: platformSettings.balance,
                    binanceTxId: record.id,
                    notes: 'Retiro sincronizado automáticamente (Completado)',
                  },
                });
              });
              return { type: 'resolved' };
            }

            if ([1, 3, 5].includes(record.status)) {
              await prisma.$transaction(async (tx) => {
                const revertedSettings = await tx.platformSettings.upsert({
                  where: { key: 'platformBalance' },
                  update: { balance: { increment: payment.amount } },
                  create: { key: 'platformBalance', value: '0', balance: payment.amount },
                });

                await tx.payment.update({
                  where: { id: payment.id },
                  data: {
                    status: PaymentStatus.FAILED,
                    balanceAfter: revertedSettings.balance,
                    notes: `Retiro sincronizado automáticamente (Falló en Binance con estado: ${record.status})`,
                  },
                });
              });
              return { type: 'failed' };
            }

            return { type: 'stillPending' };
          } catch (error) {
            console.error(error);
            return { type: 'error', message: `Error sync ${payment.transactionId}` };
          }
        }),
      );

      syncResults.forEach((res) => {
        if (res.type === 'resolved') results.resolved++;
        else if (res.type === 'failed') results.failed++;
        else if (res.type === 'stillPending') results.stillPending++;
        else if (res.type === 'error') {
          results.errors.push(res.message!);
          results.stillPending++;
        }
      });

      results.total = pendingAdminWithdrawals.length;
    }

    // ── 2. Sync seller batch payouts (new) ──────────────────────────────────

    try {
      const sellerResults = await syncPendingSellerPayments();
      results.sellerPayouts = {
        total: sellerResults.total,
        resolved: sellerResults.resolved,
        failed: sellerResults.failed,
        stillPending: sellerResults.stillPending,
        errors: sellerResults.errors,
      };

      // Merge into totals
      results.total += sellerResults.total;
      results.resolved += sellerResults.resolved;
      results.failed += sellerResults.failed;
      results.stillPending += sellerResults.stillPending;
      results.errors.push(...sellerResults.errors);
    } catch (error) {
      results.errors.push(`Error sync seller payouts: ${(error as Error).message}`);
    }

    return results;
  });
