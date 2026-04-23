// ─────────────────────────────────────────────────────────────────────────────
// Seller — SellerBatch entity
// Batch de gift cards publicado por un seller.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { giftcardSchema } from '@/types/domain/giftcard/Giftcard';
import { paymentSchema } from '@/types/domain/payment/Payment';

// ── SellerBatch Entity ─────────────────────────────────────────────────────────

/**
 * Batch de gift cards publicado por un seller.
 * Cada batch contiene múltiples cards, pagos recibidos y totales calculados.
 *
 * Flujo:
 * 1. Seller sube códigos (bulk paste o screenshots OCR)
 * 2. Seller revisa y resuelve mismatches → publishBatch()
 * 3. Batch publicado → cards disponibles para compra
 * 4. Cards comprados y confirmados → efectivoTotal aumenta
 * 5. Admin marca batch como pagado → isPaid: true
 */
export const sellerBatchSchema = z.object({
  /** ID único del batch. */
  id: z.string(),
  /** ID del usuario owner (null si fue eliminado). */
  userId: z.string().nullable(),
  /** Tasa de cambio del seller al momento de crear el batch. Fija para todo el batch. */
  sellRate: z.number(),
  /** Si el batch fue pagado por el admin. */
  isPaid: z.boolean(),
  /** ISO timestamp de creación. */
  createdAt: z.string(),
  /** ISO timestamp de última actualización. Opcional. */
  updatedAt: z.string().optional(),
  /** Gift cards incluidos en este batch. */
  giftcards: z.array(giftcardSchema),
  /** Pagos recibidos por ventas de este batch. */
  payments: z.array(paymentSchema),
  /**
   * Monto efectivo calculado (solo cards confirmados):
   * - Cards USED → face value
   * - Cards WRONG_AMOUNT → reportedAmount
   * - Cards no confirmados → $0
   */
  effectiveTotal: z.number(),
  /** Pago estimado = effectiveTotal × sellRate. */
  estimatedPayout: z.number(),
});

/** Tipo TypeScript para SellerBatch. */
export type SellerBatch = z.infer<typeof sellerBatchSchema>;

// ── Get Seller Batches ──────────────────────────────────────────────────────────

/** Schema de entrada para getSellerBatches (paginación). */
export const getSellerBatchesInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
});

export type GetSellerBatchesInput = z.infer<typeof getSellerBatchesInputSchema>;
