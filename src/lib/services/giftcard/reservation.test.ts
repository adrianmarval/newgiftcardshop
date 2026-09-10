import { describe, it, expect, vi } from 'vitest';
import { reserveGiftcards, GiftcardReservationError } from './reservation';

// tx mínimo: reserveGiftcards solo usa tx.giftcard.updateMany
function makeTx(count: number) {
  return {
    giftcard: {
      updateMany: vi.fn().mockResolvedValue({ count }),
    },
  } as never;
}

describe('reserveGiftcards', () => {
  it('reserva todas las tarjetas cuando el count coincide', async () => {
    const tx = makeTx(3);

    await expect(reserveGiftcards(tx, ['a', 'b', 'c'], 'order-1')).resolves.toBeUndefined();
  });

  it('aplica el guard anti-race en el where (inStock, UNUSED, orderId null)', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = { giftcard: { updateMany } } as never;

    await reserveGiftcards(tx, ['a', 'b'], 'order-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['a', 'b'] },
        inStock: true,
        status: 'UNUSED',
        orderId: null,
      },
      data: { inStock: false, orderId: 'order-1' },
    });
  });

  it('lanza GiftcardReservationError si alguna tarjeta ya no está disponible', async () => {
    const tx = makeTx(1);

    await expect(reserveGiftcards(tx, ['a', 'b'], 'order-1')).rejects.toBeInstanceOf(
      GiftcardReservationError,
    );
  });

  it('lanza si ninguna tarjeta se pudo reservar', async () => {
    const tx = makeTx(0);

    await expect(reserveGiftcards(tx, ['a'], 'order-1')).rejects.toThrow(
      'Una o más tarjetas ya no están disponibles',
    );
  });
});
