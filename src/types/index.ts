// ─────────────────────────────────────────────────────────────────────────────
// Types — Central barrel export
// Import from "@/types" to access all shared project types.
//
// Example:
//   import type { Brand, Country, BuyGiftcardStatus } from "@/types";
// ─────────────────────────────────────────────────────────────────────────────

export type {
  // domain.ts
  Brand,
  Country,
  GiftcardStatus,
  Giftcard,
  Payment,
  Batch,
  ParsedGiftCard,
  GiftcardIssue,
  PlatformSetting,
} from "./domain";

export type {
  // flows.ts
  BuyGiftcardStatus,
  BuyGiftcardItem,
  BuyFlowState,
  GiftCardItem,
  SellFlowState,
} from "./flows";

export type {
  // auth.ts
  ProfileState,
  ForgotPasswordState,
  ResendState,
  Portal,
  ProfileFormProps,
  Verify2FAFormProps,
  LoginFormProps,
  RegisterFormProps,
  SecuritySectionProps,
  ProfileInfoSectionProps,
  TwoFactorSectionProps,
} from "./auth";

export type {
  // ui.ts
  NavItemIcon,
  NavItem,
  PortalSidebarProps,
} from "./ui";

export type {
  // components.ts
  SellerCardsViewProps,
  SellBatchManagerProps,
  BrandStepProps,
  ReviewStepProps,
  BulkPasteDialogProps,
} from "./sell";

export type {
  // server.ts — server-only types (Prisma/Decimal). Do NOT import in Client Components.
  GiftcardSelectionResult,
  BatchInfo,
  PreprocessedBatchData,
} from "./server";

export type {
  // email.ts
  VerifyEmailProps,
  ResetPasswordProps,
} from "./email";
