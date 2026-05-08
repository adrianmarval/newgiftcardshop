import type { Context, SessionFlavor } from 'grammy';
import type { User } from '@/generated/prisma/client';

// ── Wizard steps ─────────────────────────────────────────────────────────────

export type SellerWizardStep =
  | 'idle'
  // Registro inicial (sin cuenta)
  | 'awaitingName'
  | 'awaitingEmail'
  | 'awaitingOtp'
  | 'awaitingPassword'
  // Flujo de venta
  | 'awaitingCodes';

export type BuyerWizardStep =
  | 'idle'
  // Registro inicial (sin cuenta)
  | 'awaitingName'
  | 'awaitingEmail'
  | 'awaitingOtp'
  | 'awaitingPassword'
  // Flujo de compra
  | 'awaitingAmount'
  | 'awaitingPaymentId'
  | 'awaitingReportAmount'
  | 'awaitingReportProof';

// ── Session ──────────────────────────────────────────────────────────────────

export interface SellerSessionData {
  wizard: {
    step: SellerWizardStep;
    // Registro
    regName?: string;
    regEmail?: string;
    // Sell wizard
    brandId?: string;
    brandName?: string;
    countryId?: string;
    countryName?: string;
    brandCountryId?: string;
  };
  storedMessageIds: number[];
}

export interface BuyerSessionData {
  wizard: {
    step: BuyerWizardStep;
    // Registro
    regName?: string;
    regEmail?: string;
    // Buy wizard
    brandId?: string;
    brandName?: string;
    countryId?: string;
    countryName?: string;
    orderId?: string;
    reportCardId?: string;
    reportIssueType?: 'INVALID' | 'ALREADY_USED' | 'DEACTIVATED' | 'WRONG_AMOUNT';
    reportAmount?: number;
    reportProofUrl?: string;
    selectedGiftcardIds?: string[];
  };
  storedMessageIds: number[];
}

// ── Context ──────────────────────────────────────────────────────────────────

export interface SellerContext extends Context, SessionFlavor<SellerSessionData> {
  user: User;
}

export interface BuyerContext extends Context, SessionFlavor<BuyerSessionData> {
  user: User;
}
