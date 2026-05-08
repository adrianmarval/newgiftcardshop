import { formatDateTime } from '@/lib/date-formatter';

type Lang = 'en' | 'es';

// ── Money ─────────────────────────────────────────────────────────────────────

export function fmt$(amount: number | string | { toNumber(): number }): string {
  const n = typeof amount === 'object' ? amount.toNumber() : Number(amount);
  return `$${n.toFixed(2)}`;
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

export function fmtOrderStatus(status: string, lang: Lang = 'es'): string {
  const labels: Record<Lang, Record<string, string>> = {
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

export function fmtBatchStatus(isPaid: boolean, lang: Lang = 'es'): string {
  if (lang === 'en') return isPaid ? '✅ Paid' : '⏳ Awaiting Payment';
  return isPaid ? '✅ Pagado' : '⏳ Pendiente de pago';
}

export function fmtGiftcardStatus(status: string, lang: Lang = 'es'): string {
  const labels: Record<Lang, Record<string, string>> = {
    es: {
      UNUSED: '🟢 Sin usar',
      USED: '✅ Usada',
      ALREADY_USED: '⚠️ Ya usada',
      INVALID: '❌ Inválida',
      DEACTIVATED: '🚫 Desactivada',
      WRONG_AMOUNT: '💰 Monto incorrecto',
    },
    en: {
      UNUSED: '🟢 Unused',
      USED: '✅ Used',
      ALREADY_USED: '⚠️ Already Used',
      INVALID: '❌ Invalid',
      DEACTIVATED: '🚫 Deactivated',
      WRONG_AMOUNT: '💰 Wrong Amount',
    },
  };
  return labels[lang][status] ?? status;
}
