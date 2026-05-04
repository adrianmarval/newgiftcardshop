'use server';

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { depositSchema } from '@/types/domain/payment/Payment';
import { z } from 'zod';
import { getPlatformBalance, updatePlatformBalance } from '../platform/settings';

const createDepositInputSchema = depositSchema.omit({ relatedUserId: true });

const createDepositOutputSchema = z.object({
  success: z.literal(true),
  paymentId: z.string(),
  message: z.string(),
});

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
      throw new Error('Usuario no encontrado');
    }

    if (user.role !== 'ADMIN') {
      throw new Error('El depósito debe estar asociado a un administrador');
    }

    const response = await getPlatformBalance();

    const balanceAfter = response.data?.balance ? response.data.balance.add(new Prisma.Decimal(amount)) : new Prisma.Decimal(amount);

    const payment = await prisma.$transaction(async (tx) => {
      // update balance de la plataforma
      const response = await updatePlatformBalance({ amount: new Prisma.Decimal(amount), type: 'add' });
      if (!response.data?.success) {
        throw new Error('Error al actualizar el balance de la plataforma');
      }
      return await tx.payment.create({
        data: {
          amount: new Prisma.Decimal(amount),
          balanceAfter: balanceAfter,
          direction: 'CREDIT',
          category: 'DEPOSIT',
          relatedUserId,
          binanceTxId: binanceTxId ?? null,
          notes: notes ?? null,
          referenceType: 'MANUAL',
        },
      });
    });

    return {
      success: true as const,
      paymentId: payment.id,
      message: `Depósito de ${amount} USDT registrado correctamente`,
    };
  });
