'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { ActionError, adminActionClient } from '@/lib/safe-action';
import { PaymentReferenceType } from '@/generated/prisma/enums';

const createRefundInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  refundType: z.enum(['BUYER', 'SELLER']),
  relatedUserId: z.string().trim().min(1, 'User is required'),
  referenceType: z.enum(PaymentReferenceType),
  referenceId: z.string().trim().min(1, 'Reference ID is required'),
  notes: z.string().trim().optional(),
});

const createRefundOutputSchema = z.object({
  success: z.literal(true),
  paymentId: z.string(),
  message: z.string(),
});

export const createRefund = adminActionClient
  .inputSchema(createRefundInputSchema)
  .outputSchema(createRefundOutputSchema)
  .action(async ({ parsedInput }) => {
  const { amount, refundType, relatedUserId, referenceType, referenceId, notes } = parsedInput;

  const user = await prisma.user.findUnique({
    where: { id: relatedUserId },
    select: { id: true, name: true, role: true },
  });

  if (!user) {
    throw new ActionError('Usuario no encontrado');
  }

  const category = refundType === 'BUYER' ? 'REFUND_BUYER' : 'REFUND_SELLER';

  let orderId: string | null = null;
  let batchId: number | null = null;

  if (referenceType === 'ORDER') {
    const order = await prisma.order.findUnique({
      where: { id: referenceId },
      select: { id: true, userId: true },
    });
    if (!order) {
      throw new ActionError('Orden no encontrada');
    }
    orderId = referenceId;
  } else if (referenceType === 'BATCH') {
    const batch = await prisma.giftcardBatch.findUnique({
      where: { id: parseInt(referenceId, 10) },
      select: { id: true, userId: true },
    });
    if (!batch) {
      throw new ActionError('Batch no encontrado');
    }
    batchId = batch.id;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const updatedSettings = await tx.platformSettings.upsert({
      where: { key: 'platformBalance' },
      update: { balance: { decrement: new Prisma.Decimal(amount) } },
      create: { key: 'platformBalance', value: '', description: 'Balance General', balance: new Prisma.Decimal(0).sub(new Prisma.Decimal(amount)) },
    });

    return await tx.payment.create({
      data: {
        amount: new Prisma.Decimal(amount),
        balanceAfter: updatedSettings.balance,
        direction: 'DEBIT',
        category,
        relatedUserId,
        orderId,
        batchId,
        notes: notes ?? null,
        referenceType: referenceType as 'ORDER' | 'BATCH' | 'MANUAL',
        referenceId,
      },
    });
  });

  return {
    success: true as const,
    paymentId: payment.id,
    message: `Refund de ${amount} USDT a ${refundType === 'BUYER' ? 'buyer' : 'seller'} registrado correctamente`,
  };
});
