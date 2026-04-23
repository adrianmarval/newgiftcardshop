// ─────────────────────────────────────────────────────────────────────────────
// Types — Root barrel export
// Central export for all shared project types.
// Import from "@/types" to access types, or use subdomain barrels:
//   - "@/types/domain"     → domain entities
//   - "@/types/application" → flow states and application types
//   - "@/types/auth"       → authentication types
//   - "@/types/ui"         → UI component types
// ─────────────────────────────────────────────────────────────────────────────

// ── Domain ───────────────────────────────────────────────────────────────────
export * from './domain';

// ── Application ────────────────────────────────────────────────────────────────
export * from './application';

// ── Auth ─────────────────────────────────────────────────────────────────────
export type { ProfileState, ForgotPasswordState, ResendState } from './auth/states';
export type {
  ProfileFormProps,
  Verify2FAFormProps,
  LoginFormProps,
  RegisterFormProps,
  SecuritySectionProps,
  ProfileInfoSectionProps,
  TwoFactorSectionProps,
} from './auth/props';
export * from './auth/schemas';

// ── UI ───────────────────────────────────────────────────────────────────────
export type { NavItemIcon, NavItem } from './ui/navigation';
export type { StatsItem } from './ui/feedback';
export type { CardStatusInput } from './ui/cards';

// ── Email ─────────────────────────────────────────────────────────────────────
export type { VerifyEmailProps, ResetPasswordProps } from './email/templates';

// ── Platform ──────────────────────────────────────────────────────────────────
export type { PlatformSetting } from './platform/settings';
export { getPlatformSettingOutputSchema, setPlatformSettingInputSchema, setPlatformSettingOutputSchema } from './platform/settings';

// ── Re-exports for backwards compatibility ──────────────────────────────────
// These types were previously exported from different paths
export type { AppSection } from './application/shared/AppSection';
export { APP_SECTION_LABELS, APP_SECTION_PATHS } from './application/shared/AppSection';
export type { PaginationMeta, PaginatedResponse } from './application/shared/Pagination';
export { paginatedOutputSchema } from './application/shared/Pagination';

// ── Backwards compatibility aliases ──────────────────────────────────────────
export type { PaginationMeta as PaginationInfo } from './application/shared/Pagination';
