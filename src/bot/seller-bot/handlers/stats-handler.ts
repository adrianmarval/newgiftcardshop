import prisma from '@/lib/prisma';
import { computeFaceValueTotal } from '@/lib/services/pricing';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$ } from '@/bot/shared/formatters.js';
import { renderUI, deleteUserInput } from '@/bot/shared/ui.js';
import { InlineKeyboard } from 'grammy';

export async function handleStats(ctx: SellerContext) {
  await deleteUserInput(ctx);
  const userId = ctx.user.id;

  const [batchCount, paidBatchCount, cards] = await Promise.all([
    prisma.giftcardBatch.count({ where: { userId } }),
    prisma.giftcardBatch.count({ where: { userId, isPaid: true } }),
    prisma.giftcard.findMany({
      where: { ownerId: userId },
      select: {
        amount: true,
        inStock: true,
        status: true,
        reportedAmount: true,
        batch: { select: { sellRate: true, isPaid: true, cancelledAt: true } },
      },
    }),
  ]);

  const totalCards = cards.length;
  const soldCards = cards.filter((c) => !c.inStock).length;
  const inStockCards = cards.filter((c) => c.inStock).length;
  const faceValueTotal = cards.reduce((s, c) => s + Number(c.amount), 0);
  const faceValueSold = cards.filter((c) => !c.inStock).reduce((s, c) => s + Number(c.amount), 0);
  // Status-aware (computeFaceValueTotal): cards with issues contribute their
  // adjusted amount (WRONG_AMOUNT → reportedAmount) or 0. Cancelled batches
  // never get paid — excluded from pending.
  const earnedPaid = cards
    .filter((c) => !c.inStock && c.batch?.isPaid)
    .reduce((s, c) => s + Number(computeFaceValueTotal([c]).mul(c.batch!.sellRate)), 0);
  const earnedPending = cards
    .filter((c) => !c.inStock && c.batch && !c.batch.isPaid && !c.batch.cancelledAt)
    .reduce((s, c) => s + Number(computeFaceValueTotal([c]).mul(c.batch!.sellRate)), 0);

  const msg =
    `📊 <b>Your Statistics</b>\n\n` +
    `<b>Cards</b>\n` +
    `  Total published: ${totalCards}\n` +
    `  In stock: ${inStockCards}\n` +
    `  Sold: ${soldCards}\n\n` +
    `<b>Value</b>\n` +
    `  Total Face Value: $${faceValueTotal.toFixed(2)}\n` +
    `  Sold Face Value: $${faceValueSold.toFixed(2)}\n\n` +
    `<b>Batches</b>\n` +
    `  Total: ${batchCount}\n` +
    `  Paid: ${paidBatchCount}\n\n` +
    `<b>Payouts</b>\n` +
    `  Total Earned: ${fmt$(earnedPaid, 'USD')}\n` +
    `  Pending Payment: ${fmt$(earnedPending, 'USD')}\n\n` +
    `<b>Your current rate:</b> Granular (by brand and country)`;

  const kb = new InlineKeyboard().text('🏠 Back to Menu', 'start');
  return renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}
