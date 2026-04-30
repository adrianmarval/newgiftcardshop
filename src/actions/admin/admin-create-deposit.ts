'use server';

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { depositSchema } from '@/types/domain/payment/Payment';
import { z } from 'zod';

const createDepositInputSchema = depositSchema;

const createDepositOutputSchema = z.object({
  success: z.literal(true),
  paymentId: z.string(),
  message: z.string(),
});

export const createDeposit = adminActionClient
  .inputSchema(createDepositInputSchema)
  .outputSchema(createDepositOutputSchema)
  .action(async ({ parsedInput }) => {
    const { amount, relatedUserId, binanceTxId, notes } = parsedInput;

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

    const lastPayment = await prisma.payment.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    const lastBalance = lastPayment ? Number(lastPayment.balanceAfter) : 0;
    const newBalance = lastBalance + amount;

    const payment = await prisma.payment.create({
      data: {
        amount: new Prisma.Decimal(amount),
        balanceAfter: new Prisma.Decimal(newBalance),
        direction: 'CREDIT',
        category: 'DEPOSIT',
        relatedUserId,
        binanceTxId: binanceTxId ?? null,
        notes: notes ?? null,
        referenceType: 'MANUAL',
      },
    });

    return {
      success: true as const,
      paymentId: payment.id,
      message: `Depósito de ${amount} USDT registrado correctamente`,
    };
  });
