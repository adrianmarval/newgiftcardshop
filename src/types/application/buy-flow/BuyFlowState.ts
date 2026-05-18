// ─────────────────────────────────────────────────────────────────────────────
// Buy Flow — Estado del wizard de compra (Zustand store)
// Forma del store Zustand para el wizard de compra de 5 pasos.
// ─────────────────────────────────────────────────────────────────────────────

import type { BuyFlowCard } from './BuyFlowCard';
import type { TierInfo } from './BuyFlowActions';

// ── Buy Flow State ────────────────────────────────────────────────────────────

/**
 * Forma del store Zustand para el wizard de compra.
 *
 * Secuencia de pasos:
 * 1. SearchStep → Selección de brand, país, monto target
 * 2. ResultsStep → Cards encontrados, crear orden
 * 3. RedeemStep → Verificar códigos, reportar issues
 * 4. ConfirmUsageStep → Confirmar redemption
 * 5. PaymentStep → Enviar transaction ID de Binance
 */
export interface BuyFlowState {
  step: number;
  selectedBrand: string;
  selectedCountry: string;
  selectedCurrency: string;
  targetAmount: string;
  foundGiftcards: BuyFlowCard[];
  orderId: string | null;
  /** Se setea después de confirmOrderUsage — el adjusted total calculado por el server. */
  adjustedTotal: number | null;
  /** Información de tiers de escalación para mostrar al buyer */
  tierInfo: TierInfo | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  setStep: (step: number) => void;
  setSelectedBrand: (brand: string) => void;
  setSelectedCountry: (country: string) => void;
  setSelectedCurrency: (currency: string) => void;
  setTargetAmount: (amount: string) => void;
  setFoundGiftcards: (cards: BuyFlowCard[]) => void;
  setOrderId: (id: string | null) => void;
  setAdjustedTotal: (total: number | null) => void;
  setTierInfo: (info: TierInfo | null) => void;

  /** Quita un card de la orden (buyer cambió de opinión). */
  removeGiftcard: (id: string) => void;
  /** Reporta un issue con el card (INVALID, ALREADY_USED, WRONG_AMOUNT, etc.). */
  reportIssue: (id: string, status: BuyFlowCard['status'], correctedAmount?: number) => void;
  /** Resetea todo el form al estado inicial (step 1, sin cards). */
  resetForm: () => void;
}
