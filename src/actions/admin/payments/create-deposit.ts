'use server';

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { logger } from '@/lib/logger';
import { createDepositInputSchema, createDepositOutputSchema } from './schemas';

export const createDeposit = adminActionClient
  .inputSchema(createDepositInputSchema)
  .outputSchema(createDepositOutputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { amount, binanceTxId, notes } = parsedInput;
    const relatedUserId = ctx.auth.user.id;

    const user = await prisma.user.findUnique({
      where: { id: relatedUserId },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      throw new ActionError('Usuario no encontrado');
    }

    if (user.role !== 'ADMIN') {
      throw new ActionError('El depósito debe estar asociado a un administrador');
    }

    const payment = await prisma.$transaction(async (tx) => {
      const updatedSettings = await tx.platformSettings.upsert({
        where: { key: 'platformBalance' },
        update: { balance: { increment: new Prisma.Decimal(amount) } },
        create: { key: 'platformBalance', value: '', description: 'Balance General', balance: new Prisma.Decimal(amount) },
      });
      return await tx.payment.create({
        data: {
          amount: new Prisma.Decimal(amount),
          balanceAfter: updatedSettings.balance,
          direction: 'CREDIT',
          category: 'DEPOSIT',
          relatedUserId,
          binanceTxId: binanceTxId ?? null,
          notes: notes ?? null,
          referenceType: 'MANUAL',
        },
      });
    });

    logger.action('payment', 'admin-deposit', `Depósito de ${amount} USDT creado por admin`, {
      userId: ctx.auth.user.id,
      metadata: { paymentId: payment.id, amount, binanceTxId },
    });

    return {
      success: true as const,
      paymentId: payment.id,
      message: `Depósito de ${amount} USDT registrado correctamente`,
    };
  });