'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/binance.service';
import prisma from '@/lib/prisma';
import { PaymentDirection, PaymentCategory, PaymentStatus } from '@/generated/prisma/client';

export const syncPendingWithdrawals = adminActionClient.action(async () => {
  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PENDING,
      category: PaymentCategory.WITHDRAWAL,
      direction: PaymentDirection.DEBIT,
      transactionId: { not: null },
    },
  });

  const results = {
    total: pendingPayments.length,
    resolved: 0,
    failed: 0,
    stillPending: 0,
    errors: [] as string[],
  };

  if (pendingPayments.length === 0) return results;

  const syncResults = await Promise.all(
    pendingPayments.map(async (payment) => {
      try {
        const history = await binance.getWithdrawHistory({
          withdrawOrderId: payment.transactionId!,
        });

        if (!history || history.length === 0) {
          return { type: 'stillPending' };
        }

        const record = history[0];

        // Status 6 = COMPLETED
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

        // Status 1 = CANCELLED, 3 = REJECTED, 5 = FAILURE
        if ([1, 3, 5].includes(record.status)) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              notes: `Retiro sincronizado automáticamente (Falló en Binance con estado: ${record.status})`,
            },
          });
          return { type: 'failed' };
        }

        // Otros estados (0 = EMAIL_SENT, 2 = AWAITING_APPROVAL, 4 = PROCESSING)
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

  return results;
});
