import type { Context, SessionFlavor } from 'grammy';
import type { User, GiftcardIssueType } from '@/generated/prisma/client';

// ── Wizard steps ─────────────────────────────────────────────────────────────

/** Steps de wizard de registro — el usuario aún no tiene TelegramUser, auth se skipea. */
export const REG_WIZARD_STEPS = ['awaitingName', 'awaitingEmail', 'awaitingOtp', 'awaitingPassword', 'awaitingLinkConfirmation'] as const;
export type RegWizardStep = (typeof REG_WIZARD_STEPS)[number];

export type SellerWizardStep =
  | 'idle'
  | RegWizardStep
  // Flujo de venta
  | 'awaitingCodes'
  | 'awaitingImages'
  | 'awaitingConfirm'
  // Configuración de wallet
  | 'awaitingCoinSelection'
  | 'awaitingNetworkSelection'
  | 'awaitingAddress'
  | 'awaitingWalletType';

export type BuyerWizardStep =
  | 'idle'
  | RegWizardStep
  // Flujo de compra
  | 'awaitingAmount'
  | 'awaitingPaymentId'
  | 'awaitingReportAmount'
  | 'awaitingReportProof'
  // Security PIN (gate de revelación de códigos)
  | 'awaitingSecurityPin'
  | 'awaitingPinSetup'
  | 'awaitingPinSetupConfirm'
  | 'awaitingPinResetOtp'
  | 'awaitingPinResetNewPin'
  | 'awaitingPinResetConfirm'
  // Security PIN (cambio desde el menú)
  | 'awaitingPinChangeCurrent'
  | 'awaitingPinChangeNew'
  | 'awaitingPinChangeConfirm';

// ── Session ──────────────────────────────────────────────────────────────────

export interface SellerSessionData {
  wizard: {
    step: SellerWizardStep;
    // Registro
    regName?: string;
    regEmail?: string;
    isLinking?: boolean;
    // Confirmación de vinculación (deep link)
    linkToken?: string;
    linkUserName?: string;
    linkUserEmail?: string;
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
  // message_thread_id del topic "🤖 Menú" (cache de sesión; durable en TelegramUser.flowTopicId)
  flowTopicId?: number;
  // chat.id donde se creó flowTopicId — los topic ids son por (bot, chat)
  flowChatId?: string;
  storedMessageIds: number[];
}

export interface BuyerSessionData {
  wizard: {
    step: BuyerWizardStep;
    // Registro
    regName?: string;
    regEmail?: string;
    isLinking?: boolean;
    // Confirmación de vinculación (deep link)
    linkToken?: string;
    linkUserName?: string;
    linkUserEmail?: string;
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
    // Security PIN
    /** PIN ingresado en el paso 1 del setup/reset (se confirma en el paso 2). */
    securityPinDraft?: string;
    /** PIN actual verificado durante el flujo de cambio (transitorio, se limpia al terminar). */
    securityPinCurrent?: string;
    /** OTP de email ingresado durante el reset de PIN. */
    securityResetOtp?: string;
    /** Orden cuyos códigos se revelan tras el unlock. */
    pendingRevealOrderId?: string;
    /** Qué renderizar tras el unlock: reveal post-creación o detalle de orden. */
    pendingRevealSource?: 'buy' | 'detail';
  };
  uiMessageId?: number;
  lastChatId?: number;
  // message_thread_id del topic "🤖 Menú" (cache de sesión; durable en TelegramUser.flowTopicId)
  flowTopicId?: number;
  // chat.id donde se creó flowTopicId — los topic ids son por (bot, chat)
  flowChatId?: string;
  storedMessageIds: number[];
}

// ── Context ──────────────────────────────────────────────────────────────────

export interface SellerContext extends Context, SessionFlavor<SellerSessionData> {
  user: User;
  botRole: 'SELLER';
}

export interface BuyerContext extends Context, SessionFlavor<BuyerSessionData> {
  user: User;
  botRole: 'BUYER';
}

// ── Shared bot types ─────────────────────────────────────────────────────────

/** Union of seller and buyer contexts — used by helpers that don't care which bot. */
export type BotContext = SellerContext | BuyerContext;

/** Bot-supported languages. */
export type Lang = 'en' | 'es';

/** Roles restricted to bot onboarding (excludes ADMIN). */
export type BotRole = 'SELLER' | 'BUYER';
