import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import { decrypt } from '@/lib/encryption';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$, fmtDate, fmtBatchStatus, fmtRate, fmtGiftcardStatus } from '@/bot/shared/formatters.js';

const PAGE_SIZE = 5;

export async function handleBatches(ctx: SellerContext) {
  const userId = ctx.user.id;

  const batches = await prisma.giftcardBatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    include: {
      _count: { select: { giftcards: true } },
      giftcards: { select: { amount: true, inStock: true, status: true, reportedAmount: true } },
    },
  });

  if (batches.length === 0) {
    const kb = new InlineKeyboard().text('➕ Sell Giftcards', 'sell_start');
    return ctx.reply("📭 You haven't published any batches yet.", { reply_markup: kb });
  }

  let msg = '📦 <b>Your recent batches:</b>\n\n';
  const kb = new InlineKeyboard();

  for (const batch of batches) {
    const total = batch.giftcards.reduce((s, c) => {
      if (c.status === 'WRONG_AMOUNT') return s + Number(c.reportedAmount || 0);
      if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status)) return s;
      return s + Number(c.amount);
    }, 0);
    const sold = batch.giftcards.filter((c) => !c.inStock).length;
    const payout = total * Number(batch.sellRate);

    const hasReport = batch.giftcards.some((c) => ['WRONG_AMOUNT', 'ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status));

    msg += `<b>Batch #${batch.id}</b> · ${fmtDate(batch.createdAt, 'en')}\n`;
    msg += `   ${batch._count.giftcards} cards · ${fmt$(total)} face value\n`;
    msg += `   Sold: ${sold}/${batch._count.giftcards} · Rate: ${fmtRate(batch.sellRate)}\n`;
    msg += `   ${fmtBatchStatus(batch.isPaid, 'en')}`;
    if (!batch.isPaid) msg += ` — You earn: <b>${fmt$(payout)}</b>`;
    if (hasReport) msg += `\n   ⚠️ <b>With Reports</b>`;
    msg += '\n\n';

    kb.text(`🔍 View Batch #${batch.id} Details`, `view_batch_${batch.id}`).row();
  }

  return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
}

export async function handleViewBatch(ctx: SellerContext) {
  const batchId = parseInt(ctx.callbackQuery?.data?.replace('view_batch_', '') ?? '0');
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
        },
        orderBy: { amount: 'desc' },
      },
    },
  });

  if (!batch || batch.userId !== ctx.user.id) {
    return ctx.answerCallbackQuery('Batch not found');
  }

  const total = batch.giftcards.reduce((s, c) => {
    if (c.status === 'WRONG_AMOUNT') return s + Number(c.reportedAmount || 0);
    if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status)) return s;
    return s + Number(c.amount);
  }, 0);

  const hasReport = batch.giftcards.some((c) => ['WRONG_AMOUNT', 'ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status));

  let msg = `📦 <b>Batch #${batch.id}</b>\n`;
  msg += `Date: ${fmtDate(batch.createdAt, 'en')}\n`;
  msg += `Rate: ${fmtRate(batch.sellRate)}\n`;
  msg += `Total: ${fmt$(total)}\n`;
  msg += `Status: ${fmtBatchStatus(batch.isPaid, 'en')}\n`;
  if (hasReport) msg += `Reports: ⚠️ <b>Yes</b>\n`;
  msg += '\n';

  msg += '<b>Cards:</b>\n';
  for (const card of batch.giftcards) {
    const icon = card.inStock ? '🟢' : '🔵';
    const rawCode = decrypt(card.claimCode);
    const displayCode = `<code>${rawCode}</code>`;

    let amountLine = '';

    if (card.status === 'WRONG_AMOUNT' && card.reportedAmount) {
      amountLine = `<s>${fmt$(card.amount)}</s> ➡️ <b>${fmt$(card.reportedAmount)}</b>`;
    } else if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(card.status)) {
      amountLine = `<s>${fmt$(card.amount)}</s> 🚫`;
    } else {
      amountLine = `<b>${fmt$(card.amount)}</b>`;
    }

    msg += `${icon} ${displayCode}\n    └ ${amountLine} · <i>${fmtGiftcardStatus(card.status, 'en')}</i>\n`;
  }

  const kb = new InlineKeyboard().text('⬅️ Back', 'my_batches');
  await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
  return ctx.answerCallbackQuery();
}
