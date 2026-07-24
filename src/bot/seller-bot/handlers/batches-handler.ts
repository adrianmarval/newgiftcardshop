import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import { decrypt } from '@/lib/encryption';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$, fmtDate, fmtRate, fmtBatchStatus } from '@/bot/shared/formatters.js';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';
import { strike } from '@/bot/shared/formatters';

const PAGE_SIZE = 5;

export async function handleBatches(ctx: SellerContext) {
  await deleteUserInput(ctx);

  const userId = ctx.user.id;
  const cbData = ctx.callbackQuery?.data || '';
  const pageMatch = cbData.match(/^my_batches_(\d+)$/);
  const page = pageMatch ? parseInt(pageMatch[1]) : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [batches, totalCount] = await Promise.all([
    prisma.giftcardBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        isPaid: true,
        cancelledAt: true,
        createdAt: true,
        giftcards: {
          select: { isConfirmed: true },
        },
      },
    }),
    prisma.giftcardBatch.count({ where: { userId } }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  if (batches.length === 0 && page === 1) {
    const kb = new InlineKeyboard().text('➕ Sell Giftcards', 'sell_start').row().text('🏠 Main Menu', 'start');
    const welcomeMsg = "📭 You haven't published any batches yet.";
    await renderUI(ctx, welcomeMsg, { reply_markup: kb });
    return;
  }

  let msg = `📊 <b>Your Batches</b> (Page ${page}/${totalPages})\n\n`;
  msg += `<b>Legend:</b>\n`;
  msg += `🟡 Processing\n🔵 Confirmed\n🟢 Paid\n🔴 Cancelled\n\n`;
  msg += '👇Select a batch to see detailed information:';
  const kb = new InlineKeyboard();

  for (const batch of batches) {
    const totalItems = batch.giftcards.length;
    const confirmedCount = batch.giftcards.filter((g) => g.isConfirmed).length;
    const allConfirmed = totalItems > 0 && confirmedCount === totalItems;

    let icon = '🟡'; // PROCESSING (Amber)
    if (batch.cancelledAt) {
      icon = '🔴'; // CANCELLED (Red)
    } else if (batch.isPaid) {
      icon = '🟢'; // PAID (Emerald)
    } else if (allConfirmed) {
      icon = '🔵'; // CONFIRMED (Blue)
    }

    const dateStr = fmtDate(batch.createdAt, 'en');
    const label = `${icon} Batch #${batch.id} · ${dateStr}`;

    kb.text(label, `view_batch_${batch.id}_${page}`).row();
  }

  // Pagination buttons
  const hasNext = skip + PAGE_SIZE < totalCount;
  const hasPrev = page > 1;

  if (hasPrev || hasNext) {
    kb.row();
    if (hasPrev) kb.text('⬅️ Newer', `my_batches_${page - 1}`);
    if (hasNext) kb.text('Older ➡️', `my_batches_${page + 1}`);
    kb.row();
  }

  kb.text('🏠 Back to Menu', 'start');

  await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleViewBatch(ctx: SellerContext) {
  const data = ctx.callbackQuery?.data?.split('_') || [];
  const batchId = parseInt(data[2] || '0');
  const fromPage = parseInt(data[3] || '1');

  if (!batchId) return ctx.answerCallbackQuery('Invalid ID');

  const batch = await prisma.giftcardBatch.findUnique({
    where: { id: batchId },
    include: {
      giftcards: {
        select: {
          id: true,
          amount: true,
          inStock: true,
          status: true,
          claimCode: true,
          reportedAmount: true,
          isConfirmed: true,
          brandCountry: {
            include: {
              brand: true,
              country: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          binanceTxId: true,
          isBinanceWallet: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!batch || batch.userId !== ctx.user.id) {
    return ctx.answerCallbackQuery('Batch not found');
  }

  const { Prisma } = await import('@/generated/prisma/client');

  // Obtener brand y currency del primer card (asumimos que todos son del mismo brandCountry)
  const firstCard = batch.giftcards[0];
  const brandName = firstCard?.brandCountry?.brand?.name || 'Unknown';
  const brandIcon = firstCard?.brandCountry?.brand?.icon || '📦';
  const countryName = firstCard?.brandCountry?.country?.name || 'Unknown';
  const countryCurrency = firstCard?.brandCountry?.country?.currency || 'USD';

  const faceValueTotal = batch.giftcards.reduce((sum, card) => {
    // Si la tarjeta está anulada por un reporte, no suma nada
    if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(card.status)) {
      return sum;
    }
    // Si tiene un monto corregido (WRONG_AMOUNT), usamos ese. Si no, el original.
    const amt = card.reportedAmount ?? card.amount;
    return sum.plus(amt);
  }, new Prisma.Decimal(0));

  const sellRate = new Prisma.Decimal(batch.sellRate);
  const pendingPayment = faceValueTotal.mul(sellRate);

  // 1. Preparar datos para la tabla
  const cardData = batch.giftcards.map((card) => {
    const rawCode = escapeHTML(decrypt(card.claimCode));
    const isWrong = card.status === 'WRONG_AMOUNT';

    let amountText = fmt$(card.amount, countryCurrency);
    let correctedLine = null;

    if (isWrong && card.reportedAmount) {
      amountText = strike(fmt$(card.amount, countryCurrency));
      correctedLine = `↳ ${fmt$(card.reportedAmount, countryCurrency)}`;
    } else if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(card.status)) {
      amountText = strike(fmt$(card.amount, countryCurrency));
    }

    let reportText = '';
    if (card.status !== 'UNUSED' && card.status !== 'USED') {
      reportText = card.status === 'WRONG_AMOUNT' ? 'WRONG' : card.status;
    }

    return {
      code: rawCode,
      amount: amountText,
      used: card.isConfirmed ? '✅' : '🔲',
      report: reportText,
      correctedLine,
    };
  });

  // 2. Lógica de alineación visual
  const getVisibleLen = (s: string) => {
    const withoutStrike = s.replace(/\u0336/g, '');
    let len = 0;
    for (const char of withoutStrike) {
      len += char.length > 1 || char.charCodeAt(0) > 255 ? 2 : 1;
    }
    return len;
  };

  const padVisible = (s: string, len: number) => {
    const visibleLen = getVisibleLen(s);
    return s + ' '.repeat(Math.max(0, len - visibleLen));
  };

  const maxCodeLen = Math.max('Code'.length, ...cardData.map((d) => getVisibleLen(d.code)));
  const maxAmountLen = Math.max('Amount'.length, ...cardData.map((d) => getVisibleLen(d.amount)));

  const header = padVisible('Code', maxCodeLen + 2) + padVisible('Amount', maxAmountLen + 2) + padVisible('Used', 6) + 'Report';

  const separator = '―'.repeat(getVisibleLen(header));

  const rows: string[] = [];
  for (const d of cardData) {
    // Fila principal
    rows.push(padVisible(d.code, maxCodeLen + 2) + padVisible(d.amount, maxAmountLen + 2) + padVisible(d.used, 6) + d.report);
    // Si es WRONG_AMOUNT, agregar sub-fila
    if (d.correctedLine) {
      rows.push(padVisible('', maxCodeLen + 2) + padVisible(d.correctedLine, maxAmountLen + 2));
    }
  }

  const table = `<pre><code>${header}\n${separator}\n${rows.join('\n')}</code></pre>`;

  const completedPayments = batch.payments.filter((p) => p.status === 'COMPLETED');
  const successfulPayment = completedPayments.length > 0 ? completedPayments[0] : null;

  const msg = [
    `📦 <b>Batch: ${batch.id}</b>`,
    `<b>Status:</b> ${fmtBatchStatus(batch.isPaid, 'en', batch.cancelledAt)}`,
    `<b>Brand:</b> ${brandIcon} ${escapeHTML(brandName)} (${escapeHTML(countryName)})`,
    `<b>Date:</b> <code>${fmtDate(batch.createdAt, 'en')}</code>`,
    `<b>Total Face Value:</b> <code>${fmt$(faceValueTotal, countryCurrency)}</code>`,
    `<b>Sell Rate:</b> <code>${fmtRate(sellRate)}</code>`,
    `<b>You Earn:</b> <code>${fmt$(pendingPayment, 'USD')}</code>`,
    ...(successfulPayment
      ? [
          `━━━━━━━━━━━━━━`,
          `<b>Payment:</b> ✅ <code>${fmt$(successfulPayment.amount, 'USD')}</code>`,
          ...(successfulPayment.binanceTxId
            ? [
                `<b>${successfulPayment.isBinanceWallet ? 'Ref' : 'Tx ID'}:</b> <code>${successfulPayment.isBinanceWallet ? successfulPayment.binanceTxId : `${successfulPayment.binanceTxId.slice(0, 10)}...${successfulPayment.binanceTxId.slice(-4)}`}</code>`,
              ]
            : []),
        ]
      : []),
    `━━━━━━━━━━━━━━`,
    `<b>Giftcards:</b>`,
    table,
  ].join('\n');

  const kb = new InlineKeyboard().text('⬅️ Back', `my_batches_${fromPage}`);
  await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}
