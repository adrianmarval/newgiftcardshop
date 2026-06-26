'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { decryptGiftcardCodes } from '@/lib/utils/action-helpers';
import { GiftcardStatus } from '@/generated/prisma/enums';

const getOrderCardsInputSchema = z.object({ orderId: z.string() });

const getOrderCardsOutputSchema = z.object({
  success: z.literal(true),
  giftcards: z
    .object({
      id: z.string(),
      brand: z.string(),
      amount: z.number(),
      claimCode: z.string(),
      pinCode: z.string().optional(),
      status: z.enum(GiftcardStatus),
      reportedAmount: z.number().optional(),
      country: z.object({ name: z.string(), code: z.string(), currency: z.string().nullable() }).nullable().optional(),
    })
    .array(),
});

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
    return {
      success: true as const,
      giftcards: order.giftcards.map((card) => {
        const { claimCode, pinCode } = decryptGiftcardCodes(card);
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
