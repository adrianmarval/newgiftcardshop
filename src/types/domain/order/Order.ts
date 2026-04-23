// ─────────────────────────────────────────────────────────────────────────────
// Order — Entidad BuyerOrder y statuses
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { giftcardSchema } from '@/types/domain/giftcard/Giftcard';
import { paymentSchema } from '@/types/domain/payment/Payment';
import { paginatedOutputSchema } from '@/types/application/shared/Pagination';

// ── Order Status ──────────────────────────────────────────────────────────────

/**
 * Estados posibles de una orden de compra.
 *
 * - PENDING: Orden creada, buyer está verificando/reclamando los códigos
 * - AWAITING_PAYMENT: Códigos verificados, esperando confirmación de pago Binance
 * - COMPLETED: Pago confirmado, orden finalizada
 * - CANCELLED: Orden cancelada (buyer canceló o todos los cards fueron marcados invalid)
 */
export const orderStatusEnum = z.enum(['PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']);

/** Tipo TypeScript para OrderStatus. */
export type OrderStatus = z.infer<typeof orderStatusEnum>;

// ── BuyerOrder Entity ───────────────────────────────────────────────────────────

/**
 * Órden de compra retornada por getBuyerOrders() y getOrderById().
 * Incluye los gift cards asociados, pagos realizados y totales calculados.
 *
 * Flujo:
 * 1. Buyer selecciona cards → se crea orden en PENDING
 * 2. Buyer verifica códigos y reporta issues → orden sigue en PENDING
 * 3. Buyer confirma → adjustedTotal se calcula → AWAITING_PAYMENT
 * 4. Buyer envía transactionId de Binance → COMPLETED
 */
export const buyerOrderSchema = z.object({
  /** ID único de la orden. */
  id: z.string(),
  /** Estado actual de la orden. */
  status: orderStatusEnum,
  /** Monto total nominal (suma de face values × buyer's rate). */
  total: z.number(),
  /** Monto ajustado post-verificación (null si aún no se confirmó uso). Nullable porque la DB permite null. */
  adjustedTotal: z.number().nullable(),
  /** Tasa de cambio del buyer al momento de crear la orden. Fija para toda la orden. */
  buyRate: z.number(),
  /** ISO timestamp de creación. */
  createdAt: z.string(),
  /** ISO timestamp de última actualización. */
  updatedAt: z.string(),
  /** Gift cards incluidos en esta orden. */
  giftcards: z.array(giftcardSchema),
  /** Pagos realizados (actualmente solo uno: el pago Binance al completar). */
  payments: z.array(paymentSchema),
  /**
   * Monto efectivo calculado:
   * - Cards UNUSED/USED → face value × buyRate
   * - Cards WRONG_AMOUNT → reportedAmount × buyRate
   * - Cards INVALID/ALREADY_USED/DEACTIVATED → $0
   */
  effectiveTotal: z.number(),
  /**
   * Valor nominal total (face value) de las tarjetas incluidas.
   * Suma el valor original de UNUSED/USED y el reportado de WRONG_AMOUNT.
   * Resta a 0 el valor de las tarjetas rechazadas o inválidas.
   */
  faceValueTotal: z.number(),
});

/** Tipo TypeScript para BuyerOrder. */
export type BuyerOrder = z.infer<typeof buyerOrderSchema>;

// ── Get User Buy Rate ───────────────────────────────────────────────────────────

/** Schema de salida para getUserBuyRate */
export const getUserBuyRateOutputSchema = z.object({
  success: z.literal(true),
  rate: z.number(),
});

// ── Create Order ───────────────────────────────────────────────────────────────

/** Schema de entrada para createOrder */
export const createOrderInputSchema = z.object({
  giftcardIds: z.array(z.string()),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

/** Schema de salida para createOrder */
export const createOrderOutputSchema = z.union([
  z.object({ success: z.literal(true), orderId: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Confirm Order Usage ─────────────────────────────────────────────────────────

/**
 * Schema de entrada para confirmOrderUsage.
 * El buyer confirma que los códigos son correctos y procede al pago.
 */
export const confirmOrderUsageInputSchema = z.object({ orderId: z.string() });

export type ConfirmOrderUsageInput = z.infer<typeof confirmOrderUsageInputSchema>;

/** Schema de salida para confirmOrderUsage */
export const confirmOrderUsageOutputSchema = z.union([
  z.object({ success: z.literal(true), adjustedTotal: z.number() }),
  z.object({ error: z.string() }),
]);

// ── Complete Order ──────────────────────────────────────────────────────────────

/** Schema de entrada para completeOrder (confirmación de pago Binance). */
export const completeOrderInputSchema = z.object({
  orderId: z.string(),
  /** ID de transacción de Binance Pay. */
  _transactionId: z.string(),
});

export type CompleteOrderInput = z.infer<typeof completeOrderInputSchema>;

/** Schema de salida para completeOrder */
export const completeOrderOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    orderId: z.string(),
    message: z.string(),
  }),
  z.object({ error: z.string() }),
]);

// ── Cancel Order ───────────────────────────────────────────────────────────────

/** Schema de entrada para cancelOrder */
export const cancelOrderInputSchema = z.object({ orderId: z.string() });

export type CancelOrderInput = z.infer<typeof cancelOrderInputSchema>;

/** Schema de salida para cancelOrder */
export const cancelOrderOutputSchema = z.union([
  z.object({ success: z.literal(true), message: z.string() }),
  z.object({ error: z.string() }),
]);

// ── Get Order By ID ─────────────────────────────────────────────────────────────

/** Schema de entrada para getOrderById */
export const getOrderByIdInputSchema = z.object({ orderId: z.string() });

export type GetOrderByIdInput = z.infer<typeof getOrderByIdInputSchema>;

/** Schema de salida para getOrderById */
export const getOrderByIdOutputSchema = z.union([
  z.object({ success: z.literal(true), order: buyerOrderSchema }),
  z.object({ error: z.string() }),
]);

// ── Get Buyer Orders ───────────────────────────────────────────────────────────

/**
 * Schema de entrada para getBuyerOrders (paginación).
 * Todos los campos son opcionales con defaults sensatos.
 */
export const getBuyerOrdersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  status: z.enum(['PENDING', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export type GetBuyerOrdersInput = z.infer<typeof getBuyerOrdersInputSchema>;

/** Schema de salida para getBuyerOrders (usa paginatedOutputSchema). */
export const getBuyerOrdersOutputSchema = paginatedOutputSchema(z.array(buyerOrderSchema));
