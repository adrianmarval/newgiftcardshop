import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks de módulos ─────────────────────────────────────────────────────────

const mockCardFindUnique = vi.fn();
const mockImageDeleteMany = vi.fn();
const mockImageCreate = vi.fn();
const mockCardUpdate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    giftcard: {
      findUnique: (...args: unknown[]) => mockCardFindUnique(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        provenanceImage: {
          deleteMany: (...args: unknown[]) => mockImageDeleteMany(...args),
          create: (...args: unknown[]) => mockImageCreate(...args),
        },
        giftcard: {
          update: (...args: unknown[]) => mockCardUpdate(...args),
        },
      }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), action: vi.fn() },
}));

import { attachProvenanceImage } from './provenance';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IMAGE = new Uint8Array(new TextEncoder().encode('fake-encrypted-image'));
const BASE_PARAMS = { giftcardId: 'card-1', userId: 'seller-1', data: IMAGE, mimeType: 'image/jpeg', size: 1234 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('attachProvenanceImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImageCreate.mockResolvedValue({ id: 'img-new' });
  });

  it('adjunta la imagen con ambos links (giftcardId plano + FK de la card)', async () => {
    mockCardFindUnique.mockResolvedValue({ id: 'card-1', ownerId: 'seller-1', batchId: 42 });

    await attachProvenanceImage(BASE_PARAMS);

    expect(mockImageCreate).toHaveBeenCalledWith({
      data: { data: IMAGE, mimeType: 'image/jpeg', size: 1234, giftcardId: 'card-1', batchId: '42' },
      select: { id: true },
    });
    expect(mockCardUpdate).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: { provenanceImageId: 'img-new' },
    });
  });

  it('re-adjuntar borra las imágenes previas de la card en la misma tx', async () => {
    mockCardFindUnique.mockResolvedValue({ id: 'card-1', ownerId: 'seller-1', batchId: 42 });

    await attachProvenanceImage(BASE_PARAMS);

    expect(mockImageDeleteMany).toHaveBeenCalledWith({ where: { giftcardId: 'card-1' } });
  });

  it('rechaza si la card no existe', async () => {
    mockCardFindUnique.mockResolvedValue(null);

    await expect(attachProvenanceImage(BASE_PARAMS)).rejects.toThrow('Card not found');
    expect(mockImageCreate).not.toHaveBeenCalled();
  });

  it('rechaza si el seller no es el owner de la card', async () => {
    mockCardFindUnique.mockResolvedValue({ id: 'card-1', ownerId: 'otro-seller', batchId: 42 });

    await expect(attachProvenanceImage(BASE_PARAMS)).rejects.toThrow('This card does not belong to you');
    expect(mockImageCreate).not.toHaveBeenCalled();
  });

  it('rechaza si la card no pertenece a un batch', async () => {
    mockCardFindUnique.mockResolvedValue({ id: 'card-1', ownerId: 'seller-1', batchId: null });

    await expect(attachProvenanceImage(BASE_PARAMS)).rejects.toThrow('Card is not part of a batch');
    expect(mockImageCreate).not.toHaveBeenCalled();
  });
});
