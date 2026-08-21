'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { computeOrderGiftcardTotals } from '@/lib/services/pricing';
import { orderNeedsSecurityGate, isSecurityUnlocked } from '@/lib/services';
import { MASKED_CLAIM_CODE } from '@/lib/services/order/order-list.service';
import { GiftcardStatus, OrderStatus } from '@/generated/prisma/enums';
import { getOrderByIdInputSchema, getOrderByIdOutputSchema } from './schemas';

export const getOrderById = buyerActionClient
  .inputSchema(getOrderByIdInputSchema)
  .outputSchema(getOrderByIdOutputSchema)
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

    // Security gate: mask codes when the order has unconfirmed cards and the
    // buyer hasn't unlocked codes (PIN/passkey). Codes never leave the server.
    const codesLocked = orderNeedsSecurityGate(order.giftcards) && !(await isSecurityUnlocked(order.userId));

    const giftcards = order.giftcards.map((card) => {
      const { claimCode, pinCode } = codesLocked ? { claimCode: MASKED_CLAIM_CODE, pinCode: null } : decryptGiftcardCodes(card);
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
        brandCountryId: card.brandCountryId,
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
    const firstCard = order.giftcards[0];
    const brandCountryId = firstCard?.brandCountryId ?? undefined;

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
        codesLocked,
        giftcards,
        payments,
        brandCountryId,
      },
    };
  });