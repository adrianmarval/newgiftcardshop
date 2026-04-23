'use server';

import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { ActionError, buyerActionClient } from '@/lib/safe-action';
import { getOrderCardsInputSchema, getOrderCardsOutputSchema } from '@/types/application/buy-flow';
import type { BuyFlowGiftcardStatus } from '@/types/application/buy-flow';

export const getOrderCards = buyerActionClient
  .inputSchema(getOrderCardsInputSchema)
  .outputSchema(getOrderCardsOutputSchema)
  .action(async ({ parsedInput: { orderId }, ctx }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        giftcards: {
          include: { brand: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) throw new ActionError('Orden no encontrada');
    if (order.userId !== ctx.auth.user.id) throw new ActionError('No estás autorizado para ver esta orden');
    return {
      success: true as const,
      giftcards: order.giftcards.map((card) => {
        let claimCode: string;
        try {
          claimCode = decrypt(card.claimCode);
        } catch {
          claimCode = card.claimCode;
        }
        let pinCode: string | undefined;
        if (card.pinCode) {
          try {
            pinCode = decrypt(card.pinCode);
          } catch {
            pinCode = card.pinCode;
          }
        }
        return {
          id: card.id,
          brand: card.brandId,
          amount: card.amount.toNumber(),
          claimCode,
          pinCode,
          status: (card.status as BuyFlowGiftcardStatus) ?? 'UNUSED',
          reportedAmount: card.reportedAmount ? card.reportedAmount.toNumber() : undefined,
        };
      }),
    };
  });
