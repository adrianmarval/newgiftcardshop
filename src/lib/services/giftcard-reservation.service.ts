import type { TransactionClient } from '@/generated/prisma/internal/prismaNamespace';

export class GiftcardReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GiftcardReservationError';
  }
}

export async function reserveGiftcards(
  tx: TransactionClient,
  giftcardIds: string[],
  orderId: string,
): Promise<void> {
  const result = await tx.giftcard.updateMany({
    where: {
      id: { in: giftcardIds },
      inStock: true,
      status: 'UNUSED',
      orderId: null,
    },
    data: {
      inStock: false,
      orderId,
    },
  });

  if (result.count !== giftcardIds.length) {
    throw new GiftcardReservationError(
      'Una o más tarjetas ya no están disponibles. Por favor, volvé a buscar.',
    );
  }
}
