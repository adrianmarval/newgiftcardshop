'use server';

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { adminActionClient } from '@/lib/safe-action';
import { refundSchema } from '@/types/domain/payment/Payment';
import { z } from 'zod';

const createRefundInputSchema = refundSchema;

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
      throw new Error('Usuario no encontrado');
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
        throw new Error('Orden no encontrada');
      }
      orderId = referenceId;
    } else if (referenceType === 'BATCH') {
      const batch = await prisma.giftcardBatch.findUnique({
        where: { id: parseInt(referenceId, 10) },
        select: { id: true, userId: true },
      });
      if (!batch) {
        throw new Error('Batch no encontrado');
      }
      batchId = batch.id;
    }

    const lastPayment = await prisma.payment.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });

    const lastBalance = lastPayment ? Number(lastPayment.balanceAfter) : 0;
    const newBalance = lastBalance - amount;

    const payment = await prisma.payment.create({
      data: {
        amount: new Prisma.Decimal(amount),
        balanceAfter: new Prisma.Decimal(newBalance),
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

    return {
      success: true as const,
      paymentId: payment.id,
      message: `Refund de ${amount} USDT a ${refundType === 'BUYER' ? 'buyer' : 'seller'} registrado correctamente`,
    };
  });
