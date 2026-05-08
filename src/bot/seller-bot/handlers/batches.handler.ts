import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import { decrypt } from '@/lib/encryption';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$, fmtDate, fmtBatchStatus, fmtRate, fmtGiftcardStatus } from '@/bot/shared/formatters.js';

const PAGE_SIZE = 5;

export async function handleBatches(ctx: SellerContext) {
  const userId = ctx.user.id;
  const page = parseInt(ctx.callbackQuery?.data?.split('_').pop() || '1') || 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [batches, totalCount] = await Promise.all([
    prisma.giftcardBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        _count: { select: { giftcards: true } },
        giftcards: { select: { amount: true, inStock: true, status: true, reportedAmount: true } },
      },
    }),
    prisma.giftcardBatch.count({ where: { userId } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (batches.length === 0 && page === 1) {
    const kb = new InlineKeyboard().text('➕ Sell Giftcards', 'sell_start');
    return ctx.reply("📭 You haven't published any batches yet.", { reply_markup: kb });
  }

  let msg = `📦 <b>Your recent batches (Page ${page} of ${totalPages}):</b>\n\n`;
  const kb = new InlineKeyboard();

  for (const batch of batches) {
    const total = batch.giftcards.reduce((s, c) => {
      if (c.status === 'WRONG_AMOUNT') return s + Number(c.reportedAmount || 0);
      if (['ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status)) return s;
      return s + Number(c.amount);
    }, 0);
    const sold = batch.giftcards.filter((c) => !c.inStock).length;
    const payout = total * Number(batch.sellRate);

    const hasReport = batch.giftcards.some((c) =>
      ['WRONG_AMOUNT', 'ALREADY_USED', 'INVALID', 'DEACTIVATED'].includes(c.status)
    );

    msg += `<b>Batch #${batch.id}</b> · 🔵 ${fmtDate(batch.createdAt, 'en')}\n`;
    msg += `   ${batch._count.giftcards} cards · ${fmt$(total)} face value\n`;
    msg += `   Sold: ${sold}/${batch._count.giftcards} · Rate: ${fmtRate(batch.sellRate)}\n`;
    msg += `   ${fmtBatchStatus(batch.isPaid, 'en')}`;
    if (!batch.isPaid) msg += ` — You earn: <b>${fmt$(payout)}</b>`;
    if (hasReport) msg += `\n   ⚠️ <b>With Reports</b>`;
    msg += '\n\n';

    kb.text(`🔍 View #${batch.id}`, `view_batch_${batch.id}`).row();
  }

  // Pagination buttons
  const hasNext = skip + PAGE_SIZE < totalCount;
  const hasPrev = page > 1;

  if (hasPrev || hasNext) {
    if (hasPrev) kb.text('⬅️ Newer', `my_batches_${page - 1}`);
    if (hasNext) kb.text('Older ➡️', `my_batches_${page + 1}`);
    kb.row();
  }

  if (ctx.callbackQuery) {
    return ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
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
