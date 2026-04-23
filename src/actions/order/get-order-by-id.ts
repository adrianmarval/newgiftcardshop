'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { decrypt } from '@/lib/encryption';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import type { OrderStatus } from '@/types/domain/order';
import type { Giftcard, GiftcardStatus } from '@/types/domain/giftcard';
import type { Payment, PaymentStatus } from '@/types/domain/payment';
import { getOrderByIdInputSchema, getOrderByIdOutputSchema } from '@/types/domain/order';

function computeTotals(
  giftcards: { status: string; amount: Prisma.Decimal; reportedAmount: Prisma.Decimal | null }[],
  buyRate: Prisma.Decimal,
) {
  const faceValueTotal = giftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED' || card.status === 'USED') return sum.plus(card.amount);
    if (card.status === 'WRONG_AMOUNT') return sum.plus(card.reportedAmount ?? new Prisma.Decimal(0));
    return sum;
  }, new Prisma.Decimal(0));
  return {
    faceValueTotal: faceValueTotal.toNumber(),
    effectiveTotal: faceValueTotal.mul(buyRate).toNumber(),
  };
}

export const getOrderById = buyerActionClient
  .inputSchema(getOrderByIdInputSchema)
  .outputSchema(getOrderByIdOutputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: { include: { brand: true, country: true } },
        payments: { where: { status: 'COMPLETED' } },
      },
    });

    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No estás autorizado para ver esta orden');

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    const { order } = ctx;

    const giftcards: Giftcard[] = order.giftcards.map((card) => {
      let claimCode = card.claimCode;
      let pinCode = card.pinCode ?? null;
      try {
        claimCode = decrypt(card.claimCode);
      } catch {
        /* legacy unencrypted */
      }
      if (card.pinCode) {
        try {
          pinCode = decrypt(card.pinCode);
        } catch {
          pinCode = card.pinCode;
        }
      }
      return {
        id: card.id,
        claimCode,
        pinCode,
        amount: Number(card.amount),
        status: card.status as GiftcardStatus,
        isConfirmed: card.isConfirmed,
        reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
        orderId: card.orderId,
        batchId: card.batchId ?? undefined,
        brand: {
          name: card.brand.name,
          icon: card.brand.icon,
          image: card.brand.image,
        },
        country: card.country,
      };
    });
    const payments: Payment[] = order.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      balanceAfter: Number(p.balanceAfter),
      status: p.status as PaymentStatus,
      createdAt: p.createdAt.toISOString(),
    }));
    const totals = computeTotals(order.giftcards, order.buyRate);

    return {
      success: true as const,
      order: {
        id: order.id,
        status: order.status as OrderStatus,
        total: Number(order.total),
        adjustedTotal: order.adjustedTotal ? Number(order.adjustedTotal) : null,
        buyRate: Number(order.buyRate),
        effectiveTotal: totals.effectiveTotal,
        faceValueTotal: totals.faceValueTotal,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        giftcards,
        payments,
      },
    };
  });
