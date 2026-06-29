import type { Context, SessionFlavor } from 'grammy';
import type { User, GiftcardIssueType } from '@/generated/prisma/client';

// ── Wizard steps ─────────────────────────────────────────────────────────────

export type SellerWizardStep =
  | 'idle'
  // Registro inicial (sin cuenta)
  | 'awaitingName'
  | 'awaitingEmail'
  | 'awaitingOtp'
  | 'awaitingPassword'
  // Flujo de venta
  | 'awaitingCodes'
  | 'awaitingImages'
  | 'awaitingConfirm';

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
    isLinking?: boolean;
    // Sell wizard
    brandId?: string;
    brandName?: string;
    countryId?: string;
    countryName?: string;
    countryCurrency?: string;
    brandCountryId?: string;
    pendingImages?: string[];
    currentMediaGroupId?: string;
    statusMessageId?: number;
  };
  uiMessageId?: number;
  lastChatId?: number;
  storedMessageIds: number[];
}

export interface BuyerSessionData {
  wizard: {
    step: BuyerWizardStep;
    // Registro
    regName?: string;
    regEmail?: string;
    isLinking?: boolean;
    // Buy wizard
    brandId?: string;
    brandName?: string;
    countryId?: string;
    countryName?: string;
    countryCurrency?: string;
    orderId?: string;
    reportCardId?: string;
    reportIssueType?: GiftcardIssueType;
    reportAmount?: number;
    reportProofUrl?: string;
    selectedGiftcardIds?: string[];
  };
  uiMessageId?: number;
  lastChatId?: number;
  storedMessageIds: number[];
}

// ── Context ──────────────────────────────────────────────────────────────────

export interface SellerContext extends Context, SessionFlavor<SellerSessionData> {
  user: User;
}

export interface BuyerContext extends Context, SessionFlavor<BuyerSessionData> {
  user: User;
}

// ── Shared bot types ─────────────────────────────────────────────────────────

/** Union of seller and buyer contexts — used by helpers that don't care which bot. */
export type BotContext = SellerContext | BuyerContext;

/** Bot-supported languages. */
export type Lang = 'en' | 'es';

/** Roles restricted to bot onboarding (excludes ADMIN). */
export type BotRole = 'SELLER' | 'BUYER';
