import prisma from '@/lib/prisma';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$, fmtRate } from '@/bot/shared/formatters.js';
import { renderUI, deleteUserInput } from '@/bot/shared/ui.js';
import { InlineKeyboard } from 'grammy';

export async function handleStats(ctx: SellerContext) {
  await deleteUserInput(ctx);
  const userId = ctx.user.id;

  const [rateData, batchCount, paidBatchCount, cards] = await Promise.all([
    Promise.resolve({ sellRate: 0.75 }),
    prisma.giftcardBatch.count({ where: { userId } }),
    prisma.giftcardBatch.count({ where: { userId, isPaid: true } }),
    prisma.giftcard.findMany({
      where: { ownerId: userId },
      select: {
        amount: true,
        inStock: true,
        batch: { select: { sellRate: true, isPaid: true } },
      },
    }),
  ]);

  const totalCards = cards.length;
  const soldCards = cards.filter((c) => !c.inStock).length;
  const inStockCards = cards.filter((c) => c.inStock).length;
  const faceValueTotal = cards.reduce((s, c) => s + Number(c.amount), 0);
  const faceValueSold = cards.filter((c) => !c.inStock).reduce((s, c) => s + Number(c.amount), 0);
  const earnedPaid = cards
    .filter((c) => !c.inStock && c.batch?.isPaid)
    .reduce((s, c) => s + Number(c.amount) * Number(c.batch!.sellRate), 0);
  const earnedPending = cards
    .filter((c) => !c.inStock && !c.batch?.isPaid)
    .reduce((s, c) => s + Number(c.amount) * Number(c.batch!.sellRate), 0);

  const msg =
    `📊 <b>Your Statistics</b>\n\n` +
    `<b>Cards</b>\n` +
    `  Total published: ${totalCards}\n` +
    `  In stock: ${inStockCards}\n` +
    `  Sold: ${soldCards}\n\n` +
    `<b>Value</b>\n` +
    `  Total Face Value: ${fmt$(faceValueTotal)}\n` +
    `  Sold Face Value: ${fmt$(faceValueSold)}\n\n` +
    `<b>Batches</b>\n` +
    `  Total: ${batchCount}\n` +
    `  Paid: ${paidBatchCount}\n\n` +
    `<b>Payouts</b>\n` +
    `  Total Earned: ${fmt$(earnedPaid)}\n` +
    `  Pending Payment: ${fmt$(earnedPending)}\n\n` +
    `<b>Your current rate:</b> Granular (by brand and country)`;

  const kb = new InlineKeyboard().text('🏠 Back to Menu', 'start');
  return renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}
