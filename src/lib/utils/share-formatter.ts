import type { SellerBatch, AdminBatch, BuyerOrder, AdminOrder, Giftcard } from '@/types';

// ── Batch Share Text ──────────────────────────────────────────────────────────

export function formatBatchShareText(batch: SellerBatch | AdminBatch): string {
  const brandName = batch.giftcards[0]?.brand?.name || 'Unknown';
  const countryName = batch.giftcards[0]?.country?.name || '';
  const currency = batch.giftcards[0]?.country?.currency || 'USD';
  const cardsCount = batch.cardsCount ?? batch.giftcards.length;

  const lines: string[] = [
    `📦 Batch #${batch.id}`,
    ``,
    `🏷️ ${brandName}${countryName ? ` (${countryName})` : ''}`,
    `📊 ${cardsCount} cards | ${formatAmount(batch.effectiveTotal, currency)}`,
    ``,
    `📋 Cards:`,
    ...batch.giftcards.map((card, i) => formatCardLine(card, i + 1, currency)),
    ``,
    `🕐 ${formatDate(batch.createdAt)}`,
  ];

  return lines.join('\n');
}

// ── Order Share Text ──────────────────────────────────────────────────────────

export function formatOrderShareText(order: BuyerOrder | AdminOrder): string {
  const brandName = order.giftcards[0]?.brand?.name || 'Unknown';
  const countryName = order.giftcards[0]?.country?.name || '';
  const currency = order.giftcards[0]?.country?.currency || 'USD';
  const totalCards = order.giftcards.length;

  const lines: string[] = [
    `🛒 Order #${order.id.toUpperCase()}`,
    ``,
    `🏷️ ${brandName}${countryName ? ` (${countryName})` : ''}`,
    `📊 ${totalCards} cards | ${formatAmount(order.faceValueTotal, currency)}`,
    ``,
    `📋 Cards:`,
    ...order.giftcards.map((card, i) => formatCardLine(card, i + 1, currency)),
    ``,
    `🕐 ${formatDate(order.createdAt)}`,
  ];

  return lines.join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCardLine(card: Giftcard, index: number, currency: string): string {
  const status = card.status === 'UNUSED' ? '' : ` [${card.status}]`;
  return `  ${index}. ${card.claimCode} — ${formatAmount(card.amount, currency)}${status}`;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
