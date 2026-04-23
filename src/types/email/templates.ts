// ─────────────────────────────────────────────────────────────────────────────
// Email — Props para templates de emails transaccionales
// Compartido entre templates de email y código server-side que los envía.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props para el template de email de verificación de email.
 * El usuario hizo click en el link de verificación.
 */
export interface VerifyEmailProps {
  /** Código de verificación (token corto para verificar). */
  code: string;
  /** Nombre del usuario (opcional, para personalizar greeting). */
  userName?: string;
}

/**
 * Props para el template de email de reset de password.
 * El usuario pidió un reset de password.
 */
export interface ResetPasswordProps {
  /** URL completa con token de reset (clic para resetear). */
  url: string;
  /** Nombre del usuario (opcional). */
  userName?: string;
}
