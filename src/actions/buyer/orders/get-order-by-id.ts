'use server';

import prisma from '@/lib/prisma';
import { z } from 'zod';
import { decrypt } from '@/lib/encryption';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { computeOrderGiftcardTotals } from '@/lib/utils/action-helpers';
import { GiftcardStatus, OrderStatus } from '@/generated/prisma/enums';

const getOrderByIdInputSchema = z.object({ orderId: z.string() });

export const getOrderById = buyerActionClient
  .inputSchema(getOrderByIdInputSchema)
  .useValidated(async ({ parsedInput: { orderId }, ctx, next }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: { include: { brandCountry: { include: { brand: true, country: true } } } },
        payments: true,
      },
    });

    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No estás autorizado para ver esta orden');

    return next({ ctx: { order } });
  })
  .action(async ({ ctx }) => {
    const { order } = ctx;

    const giftcards = order.giftcards.map((card) => {
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
          name: card.brandCountry.brand.name,
          icon: card.brandCountry.brand.icon,
          image: card.brandCountry.brand.image,
        },
        country: {
          name: card.brandCountry.country.name,
          code: card.brandCountry.country.code,
          currency: card.brandCountry.country.currency,
        },
      };
    });
    const payments = order.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      balanceAfter: Number(p.balanceAfter),
      direction: p.direction,
      category: p.category,
      createdAt: p.createdAt.toISOString(),
    }));
    const totals = computeOrderGiftcardTotals(order.giftcards, order.buyRate);

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
