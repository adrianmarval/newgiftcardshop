import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@/generated/prisma/client';

// ── Mocks de módulos ─────────────────────────────────────────────────────────

const mockOrderFindUnique = vi.fn();
const mockGiftcardFindMany = vi.fn();
const mockTxOrderCreate = vi.fn();
const mockTxGiftcardUpdateMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    order: { findUnique: (...args: unknown[]) => mockOrderFindUnique(...args) },
    giftcard: { findMany: (...args: unknown[]) => mockGiftcardFindMany(...args) },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        order: { create: (...args: unknown[]) => mockTxOrderCreate(...args) },
        giftcard: { updateMany: (...args: unknown[]) => mockTxGiftcardUpdateMany(...args) },
      }),
  },
}));

const mockGetUserRates = vi.fn();
vi.mock('@/lib/services/pricing', () => ({
  getUserRates: (...args: unknown[]) => mockGetUserRates(...args),
}));

const mockCheckCreditLimit = vi.fn();
vi.mock('@/lib/services/payment/credit', () => ({
  checkCreditLimit: (...args: unknown[]) => mockCheckCreditLimit(...args),
}));

vi.mock('@/lib/realtime/bus', () => ({
  publishToUser: vi.fn(),
  publishToRole: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), action: vi.fn() },
}));

import { createOrderForBuyer, OrderCreationError } from './order-creation';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const dec = (n: number) => new Prisma.Decimal(n);

function giftcard(id: string, amount: number, brandCountryId = 'bc-1', tier: number | null = 0) {
  return { id, amount: dec(amount), brandCountryId, escalationTier: tier };
}

const BASE_INPUT = { userId: 'user-1', giftcardIds: ['g1', 'g2'], source: 'web' as const };

function setupHappyPath() {
  mockOrderFindUnique.mockResolvedValue(null);
  mockGiftcardFindMany.mockResolvedValue([giftcard('g1', 10), giftcard('g2', 20)]);
  mockGetUserRates.mockResolvedValue({ buyRate: dec(0.9), sellRate: dec(0.8), isCustom: true });
  mockCheckCreditLimit.mockResolvedValue({ allowed: true });
  mockTxOrderCreate.mockResolvedValue({ id: 'order-1', total: dec(27), buyRate: dec(0.9) });
  mockTxGiftcardUpdateMany.mockResolvedValue({ count: 2 });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHappyPath();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createOrderForBuyer — happy path', () => {
  it('crea la orden, reserva las cards y publica realtime', async () => {
    const { publishToUser, publishToRole } = await import('@/lib/realtime/bus');

    const result = await createOrderForBuyer(BASE_INPUT);

    expect(result).toEqual({ orderId: 'order-1', created: true });
    expect(mockTxOrderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        brandCountryId: 'bc-1',
        status: 'PENDING',
        total: dec(27), // 30 * 0.9
      }),
    });
    // Reserva guardada por inStock/status/orderId
    expect(mockTxGiftcardUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ inStock: true, status: 'UNUSED', orderId: null }),
      data: { inStock: false, orderId: 'order-1' },
    });
    expect(publishToUser).toHaveBeenCalledWith('user-1', ['orders', 'stats']);
    expect(publishToRole).toHaveBeenCalledWith('BUYER', ['availability']);
    expect(publishToRole).toHaveBeenCalledWith('ADMIN', ['orders']);
  });
});

describe('createOrderForBuyer — idempotencia', () => {
  it('devuelve la orden existente si la idempotency key ya existe (pre-check)', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 'order-existing' });

    const result = await createOrderForBuyer({ ...BASE_INPUT, idempotencyKey: 'key-1' });

    expect(result).toEqual({ orderId: 'order-existing', created: false });
    expect(mockTxOrderCreate).not.toHaveBeenCalled();
  });

  it('recupera la orden tras P2002 (doble submit concurrente, TOCTOU)', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '7.0.0',
    });
    mockTxOrderCreate.mockRejectedValue(p2002);
    // 1er findUnique (pre-check): null. 2do (recovery): la orden del ganador.
    mockOrderFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'order-winner' });

    const result = await createOrderForBuyer({ ...BASE_INPUT, idempotencyKey: 'key-1' });

    expect(result).toEqual({ orderId: 'order-winner', created: false });
  });
});

describe('createOrderForBuyer — stock', () => {
  it('rechaza si ninguna card sigue disponible', async () => {
    mockGiftcardFindMany.mockResolvedValue([]);

    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'NO_STOCK' });
  });

  it('rechaza orden PARCIAL: si un subset se vendió, la orden entera se rechaza', async () => {
    // Convergencia bot→web: antes la web creaba la orden con el subset en silencio
    mockGiftcardFindMany.mockResolvedValue([giftcard('g1', 10)]);

    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'NO_STOCK' });
    expect(mockTxOrderCreate).not.toHaveBeenCalled();
  });
});

describe('createOrderForBuyer — brand-country único', () => {
  it('rechaza cards de brand-countries mezclados', async () => {
    mockGiftcardFindMany.mockResolvedValue([giftcard('g1', 10, 'bc-1'), giftcard('g2', 20, 'bc-2')]);

    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'MIXED_BRAND_COUNTRY' });
  });
});

describe('createOrderForBuyer — tasa y tiers', () => {
  it('rechaza si el buyer no tiene tasa asignada', async () => {
    mockGetUserRates.mockRejectedValue(new Error('sin tasa'));

    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'NO_RATE' });
  });

  it('bloquea cards con tier > floor(buyRate * 100)', async () => {
    mockGiftcardFindMany.mockResolvedValue([giftcard('g1', 10, 'bc-1', 50), giftcard('g2', 20, 'bc-1', 95)]);
    // rate 0.9 → floor = 90 → la card tier 95 se bloquea
    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'TIER_BLOCKED' });
  });

  it('tier null se trata como 100 (inaccesible salvo tasa full)', async () => {
    mockGiftcardFindMany.mockResolvedValue([giftcard('g1', 10, 'bc-1', null), giftcard('g2', 20, 'bc-1', null)]);

    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'TIER_BLOCKED' });
  });

  it('floor sobre Decimal: buyRate 0.57 → tier 57 pasa, tier 58 se bloquea (sin float artifacts)', async () => {
    mockGetUserRates.mockResolvedValue({ buyRate: dec(0.57), sellRate: dec(0.5), isCustom: true });

    mockGiftcardFindMany.mockResolvedValue([giftcard('g1', 100, 'bc-1', 57), giftcard('g2', 100, 'bc-1', 57)]);
    await expect(createOrderForBuyer(BASE_INPUT)).resolves.toMatchObject({ created: true });

    mockGiftcardFindMany.mockResolvedValue([giftcard('g1', 100, 'bc-1', 58), giftcard('g2', 100, 'bc-1', 58)]);
    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'TIER_BLOCKED' });
  });
});

describe('createOrderForBuyer — crédito y reserva', () => {
  it('rechaza si el crédito no alcanza (revalidado dentro de la tx)', async () => {
    mockCheckCreditLimit.mockResolvedValue({ allowed: false });

    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'CREDIT_LIMIT' });
    expect(mockTxOrderCreate).not.toHaveBeenCalled();
  });

  it('mapea fallo de reserva a RESERVATION_FAILED', async () => {
    mockTxGiftcardUpdateMany.mockResolvedValue({ count: 1 }); // count mismatch

    await expect(createOrderForBuyer(BASE_INPUT)).rejects.toMatchObject({ code: 'RESERVATION_FAILED' });
  });

  it('los OrderCreationError dentro de la tx no se envuelven dos veces', async () => {
    mockCheckCreditLimit.mockResolvedValue({ allowed: false });

    const promise = createOrderForBuyer(BASE_INPUT);
    await expect(promise).rejects.toBeInstanceOf(OrderCreationError);
    await expect(promise).rejects.toMatchObject({ code: 'CREDIT_LIMIT' });
  });
});
