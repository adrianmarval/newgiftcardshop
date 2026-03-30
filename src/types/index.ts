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
} from "./domain";

export type {
  // flows.ts
  BuyGiftcardStatus,
  BuyGiftcardItem,
  GiftCardItem,
} from "./flows";

export type {
  // auth.ts
  ProfileState,
  ForgotPasswordState,
  ResendState,
  Portal,
  ProfileFormProps,
  Verify2FAFormProps,
} from "./auth";
