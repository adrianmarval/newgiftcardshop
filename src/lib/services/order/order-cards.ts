// ─────────────────────────────────────────────────────────────────────────────
// Order Cards Service — reveal de claim codes del wizard de compra (redeem step).
// Aplica el security gate: los códigos solo salen si la orden está fully
// confirmed O el buyer tiene unlock vigente. Compartido por la action
// (first paint) y el QUERY_REGISTRY (refetch client-side).
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import { decryptGiftcardCodes } from '@/lib/encryption';
import { orderNeedsSecurityGate, isSecurityUnlocked } from '@/lib/services/security';
import { GiftcardStatus } from '@/generated/prisma/enums';

export class OrderCardsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderCardsError';
  }
}

export async function getOrderCardsForBuyer(orderId: string, userId: string) {
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
  if (!order) throw new OrderCardsError('Orden no encontrada');
  if (order.userId !== userId) throw new OrderCardsError('No estás autorizado para ver esta orden');

  // Security gate: codes only leave the server when the order is fully confirmed
  // (codes already applied) or the buyer holds a valid PIN/passkey unlock window.
  const requiresUnlock = orderNeedsSecurityGate(order.giftcards) && !(await isSecurityUnlocked(userId));

  return {
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
}
