import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$ } from '@/bot/shared/formatters.js';
import { renderUI, deleteUserInput } from '@/bot/shared/ui.js';
import { getSellerBotStats } from '@/lib/services/stats/seller-stats';
import { InlineKeyboard } from 'grammy';

export async function handleStats(ctx: SellerContext) {
  await deleteUserInput(ctx);

  const stats = await getSellerBotStats(ctx.user.id);

  const msg =
    `📊 <b>Your Statistics</b>\n\n` +
    `<b>Cards</b>\n` +
    `  Total published: ${stats.totalCards}\n` +
    `  In stock: ${stats.inStockCards}\n` +
    `  Sold: ${stats.soldCards}\n\n` +
    `<b>Value</b>\n` +
    `  Total Face Value: $${stats.faceValueTotal.toFixed(2)}\n` +
    `  Sold Face Value: $${stats.faceValueSold.toFixed(2)}\n\n` +
    `<b>Batches</b>\n` +
    `  Total: ${stats.batchCount}\n` +
    `  Paid: ${stats.paidBatchCount}\n\n` +
    `<b>Payouts</b>\n` +
    `  Total Earned: ${fmt$(stats.earnedPaid, 'USD')}\n` +
    `  Pending Payment: ${fmt$(stats.earnedPending, 'USD')}\n\n` +
    `<b>Your current rate:</b> Granular (by brand and country)`;

  const kb = new InlineKeyboard().text('🏠 Back to Menu', 'start');
  return renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb });
}
