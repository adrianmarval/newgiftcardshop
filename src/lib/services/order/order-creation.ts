// ─────────────────────────────────────────────────────────────────────────────
// Order Creation Service — ÚNICA fuente de verdad para crear órdenes de compra
// Compartido por web (actions/buyer/orders/create-order) y buyer-bot
// (handlers/buy-handler). Cada canal mapea los OrderCreationError a su
// transporte (ActionError vs mensaje Telegram) — la lógica de negocio vive AQUÍ.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { AVAILABLE_GIFTCARD_WHERE } from '@/lib/constants';
import { getUserRates } from '@/lib/services/pricing';
import { reserveGiftcards, GiftcardReservationError } from '@/lib/services/giftcard/reservation';
import { checkCreditLimit } from '@/lib/services/payment/credit';
import { withSerializableRetry } from '@/lib/utils/prisma-retry';
import { publishToRole, publishToUser } from '@/lib/realtime/bus';
import { logger } from '@/lib/logger';

export type OrderCreationErrorCode =
  | 'NO_STOCK' // selección vacía o parcialmente vendida (guard anti-orden-parcial)
  | 'MIXED_BRAND_COUNTRY' // cards de más de un brand-country en la misma orden
  | 'NO_RATE' // buyer sin tasa asignada para el brand-country
  | 'TIER_BLOCKED' // alguna card tiene escalationTier > floor(buyRate*100)
  | 'CREDIT_LIMIT' // límite de crédito insuficiente (revalidado en tx)
  | 'RESERVATION_FAILED'; // las cards se vendieron entre el check y la reserva

export class OrderCreationError extends Error {
  readonly code: OrderCreationErrorCode;

  constructor(code: OrderCreationErrorCode, message: string) {
    super(message);
    this.name = 'OrderCreationError';
    this.code = code;
  }
}

export interface CreateOrderInput {
  userId: string;
  giftcardIds: string[];
  /**
   * Clave de idempotencia del cliente (web la manda; el bot puede omitirla).
   * Si ya existe una orden con esta clave, se devuelve SIN crear duplicado.
   */
  idempotencyKey?: string;
  /** Canal de origen — solo para logging/observabilidad. */
  source: 'web' | 'bot';
}

export interface CreateOrderResult {
  orderId: string;
  /** false cuando la orden ya existía (idempotency key hit / P2002 recovery). */
  created: boolean;
}

/**
 * Crea una orden PENDING para un buyer: valida stock completo, brand-country
 * único, tier access y crédito (dentro de la tx Serializable), crea la orden y
 * reserva las giftcards atómicamente. Publica la invalidación realtime.
 *
 * Reglas unificadas (antes divergentes entre web y bot):
 * - Guard anti-orden-parcial: TODAS las cards seleccionadas deben seguir
 *   disponibles; si un subset se vendió, se rechaza la orden entera.
 * - Brand-country único: la tasa y el tier floor se derivan del brandCountry —
 *   cards mezcladas se pricearían con una tasa que el admin nunca asignó ahí.
 * - Tier null = 100 (inaccesible salvo tasa full).
 */
export async function createOrderForBuyer(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { userId, giftcardIds, idempotencyKey, source } = input;

  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) {
      logger.debug('Orden existente por idempotency key', {
        userId,
        metadata: { orderId: existing.id, idempotencyKey },
      });
      return { orderId: existing.id, created: false };
    }
  }

  const giftcards = await prisma.giftcard.findMany({
    where: { id: { in: giftcardIds }, ...AVAILABLE_GIFTCARD_WHERE, orderId: null },
    select: { id: true, amount: true, brandCountryId: true, escalationTier: true },
  });

  if (giftcards.length === 0) {
    throw new OrderCreationError(
      'NO_STOCK',
      'Una o mas tarjetas de la orden ya no estan disponibles. Por favor regresa y busca tarjetas nuevamente',
    );
  }

  // Guard anti-orden-parcial: si entre el preview y el confirm se vendió un
  // SUBSET de las seleccionadas, sin este check se creaba una orden con menos
  // tarjetas (y menor total) sin avisar al buyer.
  if (giftcards.length !== giftcardIds.length) {
    throw new OrderCreationError(
      'NO_STOCK',
      'Algunas tarjetas de tu selección ya fueron compradas. Por favor regresa y busca nuevamente',
    );
  }

  const brandCountryIds = new Set(giftcards.map((card) => card.brandCountryId));
  if (brandCountryIds.size > 1) {
    throw new OrderCreationError(
      'MIXED_BRAND_COUNTRY',
      'Las tarjetas de una orden deben pertenecer a la misma marca y país. Por favor regresa y busca nuevamente',
    );
  }

  const brandCountryId = giftcards[0].brandCountryId;

  let buyRate: Prisma.Decimal;
  try {
    const rates = await getUserRates(userId, { brandCountryId });
    buyRate = rates.buyRate as Prisma.Decimal;
  } catch {
    throw new OrderCreationError(
      'NO_RATE',
      'You do not have a rate assigned for this brand and country. Contact the administrator.',
    );
  }

  // floor(buyRate * 100) sobre el Decimal — NUNCA toNumber() primero:
  // Math.floor(0.57 * 100) === 56 por float artifact y el buyer perdería un tier.
  const buyerBuyRate = buyRate.times(100).floor().toNumber();

  const blockedCount = giftcards.filter((card) => {
    const tier = card.escalationTier != null ? Number(card.escalationTier) : 100;
    return tier > buyerBuyRate;
  }).length;
  if (blockedCount > 0) {
    throw new OrderCreationError(
      'TIER_BLOCKED',
      `No puedes tomar ${blockedCount} tarjeta(s). Algunas cambiaron de tier. Por favor re-busca.`,
    );
  }

  const faceValueTotal = giftcards.reduce((sum, card) => sum.plus(card.amount), new Prisma.Decimal(0));
  const total = faceValueTotal.mul(buyRate);

  let order;
  try {
    order = await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx) => {
          // Revalidar crédito atómicamente dentro de la tx (race condition safe)
          const creditCheck = await checkCreditLimit(userId, faceValueTotal, tx);
          if (!creditCheck.allowed) {
            throw new OrderCreationError(
              'CREDIT_LIMIT',
              'Límite de crédito insuficiente. Tenés pagos pendientes que bloquean esta compra.',
            );
          }

          const created = await tx.order.create({
            data: {
              userId,
              brandCountryId,
              total,
              buyRate,
              status: 'PENDING',
              idempotencyKey,
            },
          });

          await reserveGiftcards(
            tx,
            giftcards.map((c) => c.id),
            created.id,
          );

          return created;
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  } catch (error) {
    if (error instanceof OrderCreationError) {
      throw error;
    }
    if (error instanceof GiftcardReservationError) {
      logger.warn('Error de reserva en creación de orden', {
        userId,
        metadata: { giftcardIds, source, error: error.message },
      });
      throw new OrderCreationError('RESERVATION_FAILED', error.message);
    }
    // Doble-submit concurrente con el mismo idempotencyKey: el pre-check de
    // arriba es TOCTOU — ambos requests entran a la tx y el perdedor choca con
    // el @unique. La orden del buyer YA existe: devolverla en vez de un 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        logger.info('Orden recuperada tras P2002 en idempotency key (doble submit concurrente)', {
          userId,
          metadata: { orderId: existing.id, idempotencyKey },
        });
        return { orderId: existing.id, created: false };
      }
    }
    logger.error('Error inesperado al crear orden', {
      userId,
      metadata: { giftcardIds, source },
      error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : 'Unknown' },
    });
    throw error;
  }

  logger.action('buy', source === 'bot' ? 'bot-create-order' : 'create-order', `Orden ${order.id} creada con ${giftcards.length} tarjetas`, {
    userId,
    metadata: {
      orderId: order.id,
      giftcardCount: giftcards.length,
      total: order.total.toString(),
      buyRate: order.buyRate.toString(),
    },
  });

  // Invalidación realtime: stock reservado baja para TODOS los buyers,
  // la orden aparece en el listado del buyer y en el panel admin
  publishToUser(userId, ['orders', 'stats']);
  publishToRole('BUYER', ['availability']);
  publishToRole('ADMIN', ['orders']);

  return { orderId: order.id, created: true };
}
