// ─────────────────────────────────────────────────────────────────────────────
// Giftcard — Issue reportado por el buyer
// Representa un problema reportado por el comprador durante la fase de redeem.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Issue reportado por un buyer sobre un gift card dentro de una orden.
 * Creado via reportGiftcardIssue() y almacenado en la tabla GiftcardIssue.
 *
 * El flujo es:
 * 1. Buyer recibe cards y verifica montos
 * 2. Si encuentra discrepancy, reporta issue (INVALID, ALREADY_USED, WRONG_AMOUNT, etc.)
 * 3. El admin revisa y procesa el issue
 * 4. El monto efectivo se ajusta en la orden
 */
export const giftcardIssueSchema = z.object({
  /** ID único del issue. */
  id: z.string(),
  /** Tipo de issue reportado. */
  issueType: z.enum(['INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT']),
  /** Monto real reportado por el buyer (nullable para issues sin monto específico). */
  reportedAmount: z.number().nullable().optional(),
  /** URL de la imagen de prueba subida por el buyer (opcional). */
  proofImageUrl: z.string().nullable().optional(),
  /** ID del gift card afectado. */
  giftcardId: z.string(),
  /** ID de la orden a la que pertenece el gift card. */
  orderId: z.string(),
  /** ID del usuario que reportó el issue. */
  reportedById: z.string(),
  /** ID del seller que posee el card (para referencia del admin). */
  sellerId: z.string().nullable().optional(),
  /** Timestamp ISO de creación. */
  createdAt: z.string(),
});

/** Tipo TypeScript para un GiftcardIssue. */
export type GiftcardIssue = z.infer<typeof giftcardIssueSchema>;
