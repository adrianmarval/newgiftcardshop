/**
 * Mask an email address for public display.
 * "admin@example.com" → "ad***nt@example.com"
 * "j@x.com" → "j***@x.com" (handles short local parts)
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return '***';

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  if (local.length <= 2) return `${local[0]}***${domain}`;
  if (local.length <= 4) return `${local[0]}***${local.slice(-1)}${domain}`;

  return `${local.slice(0, 2)}***${local.slice(-2)}${domain}`;
}
