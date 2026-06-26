// ─────────────────────────────────────────────────────────────────────────────
// HTML / Telegram text utilities
// Pure functions with no bot dependencies — lives in lib/utils.
// ─────────────────────────────────────────────────────────────────────────────

const TG_MAX_LEN = 4096;
const TRUNCATION_SUFFIX = '\n\n…(mensaje truncado)';

/**
 * Truncates text to fit Telegram's 4096 char limit, preserving a suffix indicator.
 */
export function truncateForTelegram(text: string): string {
  if (text.length <= TG_MAX_LEN) return text;
  const cut = TG_MAX_LEN - TRUNCATION_SUFFIX.length;
  return text.slice(0, cut) + TRUNCATION_SUFFIX;
}

/**
 * Escapes HTML special characters.
 */
export function escapeHTML(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (m) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[m] || m,
  );
}
