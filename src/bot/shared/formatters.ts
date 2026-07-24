import { formatDateTime } from '@/lib/utils';
import type { OrderStatus, GiftcardStatus } from '@/generated/prisma/enums';
import type { Lang } from './types.js';

// ── Money ─────────────────────────────────────────────────────────────────────

export function fmt$(amount: number | string | { toNumber(): number }, currency: string = 'USD'): string {
  const n = typeof amount === 'object' ? amount.toNumber() : Number(amount);
  const symbol = currency === 'GBP' ? '£' : currency === 'CAD' ? 'C$' : '$';
  return `${symbol}${n.toFixed(2)}`;
}

export function fmtRate(rate: number | string | { toNumber(): number }): string {
  const n = typeof rate === 'object' ? rate.toNumber() : Number(rate);
  return `${(n * 100).toFixed(0)}%`;
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export function fmtDate(date: Date | string, lang: Lang = 'es'): string {
  return formatDateTime(date, lang === 'en' ? 'en-US' : 'es-AR');
}

// ── Enums → emoji label ───────────────────────────────────────────────────────

export function fmtOrderStatus(status: OrderStatus, lang: Lang = 'es'): string {
  const labels: Record<Lang, Record<OrderStatus, string>> = {
    es: {
      PENDING: '⏳ Pendiente',
      AWAITING_PAYMENT: '💳 Esperando pago',
      COMPLETED: '✅ Completada',
      CANCELLED: '❌ Cancelada',
    },
    en: {
      PENDING: '⏳ Pending',
      AWAITING_PAYMENT: '💳 Awaiting Payment',
      COMPLETED: '✅ Completed',
      CANCELLED: '❌ Cancelled',
    },
  };
  return labels[lang][status] ?? status;
}

export function fmtBatchStatus(isPaid: boolean, lang: Lang = 'es', cancelledAt?: Date | string | null): string {
  if (cancelledAt) return lang === 'en' ? '❌ Cancelled' : '❌ Cancelado';
  if (lang === 'en') return isPaid ? '✅ Paid' : '⏳ Awaiting Payment';
  return isPaid ? '✅ Pagado' : '⏳ Pendiente de pago';
}

export function fmtGiftcardStatus(status: GiftcardStatus, lang: Lang = 'es'): string {
  const labels: Record<Lang, Record<GiftcardStatus, string>> = {
    es: {
      UNUSED: '🟢 Sin usar',
      USED: '✅ Usada',
      ALREADY_USED: ' Ya usada',
      INVALID: '❌ Inválida',
      DEACTIVATED: '🚫 Desactivada',
      WRONG_AMOUNT: '💰 Monto incorrecto',
    },
    en: {
      UNUSED: '🟢 Unused',
      USED: '✅ Used',
      ALREADY_USED: ' Already Used',
      INVALID: '❌ Invalid',
      DEACTIVATED: '🚫 Deactivated',
      WRONG_AMOUNT: '💰 Wrong Amount',
    },
  };
  return labels[lang][status] ?? status;
}

// ── Text Formatting ──────────────────────────────────────────────────────────

/**
 * Applies Unicode strikethrough to each character in the text.
 */
export function strike(text: string): string {
  return text
    .split('')
    .map((char) => char + '\u0336')
    .join('');
}
