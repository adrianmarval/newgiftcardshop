'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/services/binance.service';
import { Asset, Network } from '@/types';
import z from 'zod';
import prisma from '@/lib/prisma';
import { Decimal } from '@/generated/prisma/internal/prismaNamespaceBrowser';
import { PaymentDirection, PaymentCategory, PaymentReferenceType, PaymentStatus } from '@/generated/prisma/client';

export const getBinanceBalancesAction = adminActionClient.action(async () => {
  return await binance.getUsdtBalances();
});

export const withdrawBalanceAction = adminActionClient.inputSchema(z.object({ amount: z.number() })).action(async ({ parsedInput }) => {
  const WITHDRAW_WALLET = process.env.WITHDRAW_WALLET;
  const WITHDRAW_COIN = process.env.WITHDRAW_COIN as Asset;
  const WITHDRAW_NETWORK = process.env.WITHDRAW_NETWORK as Network;

  if (!WITHDRAW_WALLET || !WITHDRAW_COIN || !WITHDRAW_NETWORK) {
    throw new Error('WITHDRAW_WALLET or WITHDRAW_COIN or WITHDRAW_NETWORK is not defined');
  }

  const { amount } = parsedInput;

  // Fase 0: Evitar condiciones de carrera y duplicados
  // Verificamos si ya existe un retiro pendiente de Binance
  const existingPending = await prisma.payment.findFirst({
    where: {
      status: PaymentStatus.PENDING,
      category: PaymentCategory.WITHDRAWAL,
      direction: PaymentDirection.DEBIT,
      notes: { contains: 'Binance' },
    },
  });

  if (existingPending) {
    throw new Error(
      'Ya existe un retiro de Binance pendiente de sincronización. Por favor, usá el botón de "Sincronizar" antes de intentar uno nuevo para evitar duplicados.',
    );
  }

  const withdrawOrderId = `WD_${Date.now()}`;

  // Fase 1: Registrar la intención en la DB
  let paymentRecord;
  try {
    paymentRecord = await prisma.$transaction(async (tx) => {
      const currentSettings = await tx.platformSettings.findUnique({ where: { key: 'platformBalance' } });
      const currentBalance = currentSettings?.balance || new Decimal(0);

      return await tx.payment.create({
        data: {
          amount: new Decimal(amount),
          balanceAfter: currentBalance, // Será actualizado al completarse
          direction: PaymentDirection.DEBIT,
          category: PaymentCategory.WITHDRAWAL,
          transactionId: withdrawOrderId,
          status: PaymentStatus.PENDING,
          referenceType: PaymentReferenceType.MANUAL,
          notes: 'Retiro desde Binance hacia wallet de ahorro del Admin',
        },
      });
    });
  } catch (error) {
    throw new Error('No se pudo inicializar la transacción en la base de datos local.');
  }

  // Fase 2: Llamada idempotente a Binance
  const response = await binance.withdrawFunds({
    address: WITHDRAW_WALLET,
    amount: amount.toLocaleString(),
    coin: WITHDRAW_COIN,
    transactionFeeFlag: true,
    walletType: 1,
    network: WITHDRAW_NETWORK,
    withdrawOrderId, // ID idempotente
  });

  // Fase 3: Resolución de Estado
  if (!response.success) {
    if (response.isNetworkError) {
      throw new Error(
        `El retiro fue enviado pero hubo un problema de red. La transacción (Ref: ${withdrawOrderId}) quedará pendiente y se verificará automáticamente.`,
      );
    } else {
      // Rechazo explícito de la API de Binance
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { status: PaymentStatus.FAILED, notes: `Rechazado por Binance: ${response.error}` },
      });
      throw new Error(`Error en el retiro de Binance: ${response.error}`);
    }
  }

  // Fase 4: Éxito
  const binanceTxId = response.data.id;
  try {
    await prisma.$transaction(async (tx) => {
      const platformSettings = await tx.platformSettings.upsert({
        where: { key: 'platformBalance' },
        update: { balance: { decrement: amount } },
        create: { key: 'platformBalance', value: '0', balance: new Decimal(-amount) },
      });

      await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: PaymentStatus.COMPLETED,
          balanceAfter: platformSettings.balance,
          binanceTxId,
          notes: 'Retiro desde Binance hacia la plataforma (Completado)',
        },
      });
    });
  } catch (error) {
    console.error(
      `[CRITICAL] Binance withdrawal succeeded but DB completion failed. TxID: ${binanceTxId}. Payment ID: ${paymentRecord.id}`,
      error,
    );
    throw new Error(
      `El retiro en Binance fue exitoso (TxID: ${binanceTxId}) pero falló la sincronización local. Se resolverá en la próxima verificación automática.`,
    );
  }

  return response.data;
});

export const syncPendingWithdrawalsAction = adminActionClient.action(async () => {
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
      } catch (error: any) {
        return { type: 'error', message: `Error sync ${payment.transactionId}: ${error.message}` };
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
