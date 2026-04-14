// ─────────────────────────────────────────────────────────────────────────────
// Email Types — prop shapes for transactional email templates.
// Shared between email templates and any server-side code that sends them.
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifyEmailProps {
  code: string;
  userName?: string;
}

export interface ResetPasswordProps {
  url: string;
  userName?: string;
}
