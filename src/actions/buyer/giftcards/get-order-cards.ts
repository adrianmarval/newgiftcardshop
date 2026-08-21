'use server';

import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { orderNeedsSecurityGate, isSecurityUnlocked } from '@/lib/services';
import { GiftcardStatus } from '@/generated/prisma/enums';
import { getOrderCardsInputSchema, getOrderCardsOutputSchema } from './schemas';

export const getOrderCards = buyerActionClient
  .inputSchema(getOrderCardsInputSchema)
  .outputSchema(getOrderCardsOutputSchema)
  .action(async ({ parsedInput: { orderId }, ctx }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: {
          include: {
            brandCountry: {
              include: {
                brand: true,
                country: true,
              },
            },
          },
        },
      },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No estás autorizado para ver esta orden');

    // Security gate: codes only leave the server when the order is fully confirmed
    // (codes already applied) or the buyer holds a valid PIN/passkey unlock window.
    const requiresUnlock = orderNeedsSecurityGate(order.giftcards) && !(await isSecurityUnlocked(ctx.auth.user.id));

    return {
      success: true as const,
      requiresUnlock,
      giftcards: order.giftcards.map((card) => {
        const { claimCode, pinCode } = requiresUnlock ? { claimCode: undefined, pinCode: undefined } : decryptGiftcardCodes(card);
        return {
          id: card.id,
          brand: card.brandCountry.brand.id,
          amount: card.amount.toNumber(),
          claimCode,
          pinCode: pinCode ?? undefined,
          status: (card.status as GiftcardStatus) ?? 'UNUSED',
          reportedAmount: card.reportedAmount ? card.reportedAmount.toNumber() : undefined,
          country: card.brandCountry.country
            ? {
                name: card.brandCountry.country.name,
                code: card.brandCountry.country.code,
                currency: card.brandCountry.country.currency,
              }
            : null,
        };
      }),
    };
  });
