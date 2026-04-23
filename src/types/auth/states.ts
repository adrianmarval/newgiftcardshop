// ─────────────────────────────────────────────────────────────────────────────
// Auth — Estados de form actions (server actions)
// Estados retornados por server actions para usar con useActionState.
// ─────────────────────────────────────────────────────────────────────────────

// ── Form Action States ────────────────────────────────────────────────────────

/**
 * Estado retornado por updateProfile server action.
 * Usado con useActionState de React en ProfileForm.
 */
export type ProfileState = { error?: string; success?: boolean } | null;

/**
 * Estado retornado por forgotPassword server action.
 * Incluye el email submitado para que la UI pueda mostrarlo en el mensaje de éxito.
 */
export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
  email?: string;
} | null;

/**
 * Estado retornado por resendVerification server action.
 * Usado con useActionState de React en VerifyEmailForm.
 */
export type ResendState = { error?: string; success?: boolean } | null;
