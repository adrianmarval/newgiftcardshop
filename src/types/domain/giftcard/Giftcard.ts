// ─────────────────────────────────────────────────────────────────────────────
// Giftcard — Entity principal
// El entity Giftcard representa una gift card en el sistema.
// No confundir con SellFlowGiftcard (que es estado ephemeral del wizard).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Estados posibles de un gift card a lo largo de su lifecycle.
 *
 * - UNUSED: Card disponible para compra/uso
 * - USED: Card ya utilizada por el buyer
 * - ALREADY_USED: El código ya fue canjeado previamente (antes de la compra)
 * - INVALID: El código no es válido o está corrupto
 * - DEACTIVATED: El código fue desactivado por el emisor
 * - WRONG_AMOUNT: El monto real difiere del declarado (buyer reporta discrepancy)
 */
export const giftcardStatusEnum = z.enum(['UNUSED', 'USED', 'ALREADY_USED', 'INVALID', 'DEACTIVATED', 'WRONG_AMOUNT']);

/** Tipo TypeScript para GiftcardStatus. Usa este tipo en props de componentes. */
export type GiftcardStatus = z.infer<typeof giftcardStatusEnum>;

/**
 * Gift card serializado para cliente.
 * Incluye brand y country como sub-selections (no son schemas completos).
 * Esta es la forma en que se devuelve desde todas las server actions.
 *
 * @example
 * {
 *   "id": "gc_123",
 *   "claimCode": "AMZN-XXXX-YYYY",
 *   "pinCode": "1234",
 *   "amount": 50.00,
 *   "status": "UNUSED",
 *   "isConfirmed": false,
 *   "reportedAmount": null,
 *   "orderId": null,
 *   "batchId": "batch_456",
 *   "provenanceImageId": "img_789",
 *   "brand": { "name": "Amazon", "icon": "/icons/amazon.svg", "image": null },
 *   "country": { "name": "Argentina", "code": "AR" }
 * }
 */
export const giftcardSchema = z.object({
  /** ID único del gift card. */
  id: z.string(),
  /** Código de reclamo/canje del gift card. */
  claimCode: z.string(),
  /** PIN opcional (para tarjetas que lo requieran). */
  pinCode: z.string().nullable(),
  /** Monto nominal del gift card. */
  amount: z.number(),
  /** Estado actual del gift card. */
  status: giftcardStatusEnum,
  /** Si el card fue confirmado por el buyer (usado o issue reportado). */
  isConfirmed: z.boolean(),
  /** Monto reportado por el buyer cuando hay discrepancy (WRONG_AMOUNT). */
  reportedAmount: z.number().nullable().optional(),
  /** ID de la orden de compra asociada (null si no fue comprada). */
  orderId: z.string().nullable(),
  /** ID del batch al que pertenece este card. */
  batchId: z.number().nullable().optional(),
  /** ID de la imagen de procedencia (OCR screenshot). */
  provenanceImageId: z.string().nullable().optional(),
  /** Sub-selection de brand (solo campos necesarios para UI). */
  brand: z.object({
    name: z.string(),
    icon: z.string(),
    image: z.string().nullable(),
  }),
  /** Sub-selection de country (null si no aplica). */
  country: z.object({ name: z.string(), code: z.string(), currency: z.string().nullable() }).nullable(),
  /** Si el card coincide con la búsqueda actual (para highlighting en UI). */
  isSearchMatch: z.boolean().optional(),
});

/** Tipo TypeScript para un Giftcard serializado. */
export type Giftcard = z.infer<typeof giftcardSchema>;
