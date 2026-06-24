'use server';

import { adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/binance.service';
import { Asset, Network } from '@/types';
import z from 'zod';
import prisma from '@/lib/prisma';
import { Decimal } from '@/generated/prisma/internal/prismaNamespaceBrowser';
import { PaymentDirection, PaymentCategory, PaymentReferenceType, PaymentStatus } from '@/generated/prisma/client';

const withdrawBalanceInpuSchema = z.object({ amount: z.number() });

export const withdrawBalance = adminActionClient.inputSchema(withdrawBalanceInpuSchema).action(async ({ parsedInput }) => {
  const WITHDRAW_WALLET = process.env.WITHDRAW_WALLET;
  const WITHDRAW_COIN = process.env.WITHDRAW_COIN as Asset;
  const WITHDRAW_NETWORK = process.env.WITHDRAW_NETWORK as Network;

  if (!WITHDRAW_WALLET || !WITHDRAW_COIN || !WITHDRAW_NETWORK) {
    throw new Error('WITHDRAW_WALLET or WITHDRAW_COIN or WITHDRAW_NETWORK is not defined');
  }

  const { amount } = parsedInput;

  // Fase 0: Evitar condiciones de carrera y duplicados
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
          balanceAfter: currentBalance,
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
    console.error(error);
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
    withdrawOrderId,
  });

  // Fase 3: Resolución de Estado
  if (!response.success) {
    if (response.isNetworkError) {
      throw new Error(
        `El retiro fue enviado pero hubo un problema de red. La transacción (Ref: ${withdrawOrderId}) quedará pendiente y se verificará automáticamente.`,
      );
    } else {
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
