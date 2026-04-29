// ─────────────────────────────────────────────────────────────────────────────
// Buy Flow — Gift card en el wizard de compra
// Estado de una gift card dentro del buy flow wizard.
// NO confundir con domain/giftcard/Giftcard que es la entidad persistida.
// ─────────────────────────────────────────────────────────────────────────────

import type { GiftcardStatus } from '@/types/domain/giftcard/Giftcard';

// ── Buy Flow item types ────────────────────────────────────────────────────────

/**
 * Status de gift card para el buyer.
 * Excluye 'USED' porque buyers nunca reciben cards ya usados.
 * Estados válidos: UNUSED, ALREADY_USED, INVALID, DEACTIVATED, WRONG_AMOUNT
 */
export type BuyFlowGiftcardStatus = GiftcardStatus;

/**
 * Gift card individual dentro del wizard de compra.
 * El campo `status` tracks el reporte del buyer después de verificar el código.
 * Cuando status es WRONG_AMOUNT, `reportedAmount` guarda el monto corregido.
 *
 * Flujo:
 * 1. Step 2 (Results): Cards encontrados con status UNUSED
 * 2. Step 3 (Redeem): Buyer verifica códigos y reporta issues
 * 3. Step 4 (Confirm): Buyer confirma, adjustedTotal se calcula
 */
export interface BuyFlowCard {
  id: string;
  brand: string;
  amount: number;
  /** Solo se llena después de crear la orden y revelar códigos (step 3). */
  claimCode?: string;
  pinCode?: string;
  status: BuyFlowGiftcardStatus;
  /** Solo presente cuando status es "WRONG_AMOUNT". */
  reportedAmount?: number;
  /** ownerId del giftcard — usado para tracking de issues. */
  sellerId?: string;
  country?: {
    name: string;
    code: string;
    currency: string | null;
  } | null;
}
