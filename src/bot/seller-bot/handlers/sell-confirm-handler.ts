// ─────────────────────────────────────────────────────────────────────────────
// handleSellConfirm — Publish batch via shared service
// ─────────────────────────────────────────────────────────────────────────────

import { InlineKeyboard } from 'grammy';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$ } from '@/bot/shared/formatters.js';
import prisma from '@/lib/prisma';
import { publishBatch } from '@/lib/services/giftcard/publish.service';
import type { ParsedGiftcard } from '@/types';
import { createLogger } from '@/lib/logger';

const sellerLogger = createLogger('seller-bot');

export async function handleSellConfirm(ctx: SellerContext) {
  await deleteUserInput(ctx);

  const pendingCardsRaw = (ctx.session as any)._pendingCards as string | undefined;
  const { brandCountryId } = ctx.session.wizard;

  if (!pendingCardsRaw || !brandCountryId) {
    await ctx.answerCallbackQuery('Session expired, start over with /sell');
    return;
  }

  const cards: ParsedGiftcard[] = JSON.parse(pendingCardsRaw);

  // Resolve brandId from brandCountryId
  const brandCountry = await prisma.brandCountry.findUnique({
    where: { id: brandCountryId },
    select: { brandId: true, countryId: true, country: { select: { currency: true } } },
  });

  if (!brandCountry) {
    await ctx.answerCallbackQuery('Error: brand-country not found');
    return renderUI(ctx, '❌ Error: brand-country not found.', {
      reply_markup: new InlineKeyboard().text('🏠 Home', 'start'),
    });
  }

  try {
    const result = await publishBatch({
      userId: ctx.user.id,
      brandId: brandCountry.brandId,
      countryId: brandCountry.countryId,
      cards: cards.map((c) => ({
        amount: c.amount ?? '0',
        claimCode: c.claimCode,
        pinCode: c.pinCode,
      })),
    });

    // Reassign temp Telegram images to the real batch
    const pendingImagesCount = await prisma.provenanceImage.count({
      where: { batchId: `temp_${ctx.from?.id}` },
    });

    if (pendingImagesCount > 0) {
      await prisma.provenanceImage.updateMany({
        where: { batchId: `temp_${ctx.from?.id}` },
        data: { batchId: result.batchId.toString() },
      });
    }

    // Clean up session
    ctx.session.wizard.step = 'idle';
    (ctx.session as any)._pendingCards = undefined;
    (ctx.session as any)._pendingErrors = undefined;
    ctx.session.storedMessageIds = [];

    const totalFace = cards.reduce((s, c) => s + parseFloat(c.amount || '0'), 0);
    const sellRate = await prisma.giftcardBatch.findUnique({ where: { id: result.batchId }, select: { sellRate: true } });
    const payout = totalFace * Number(sellRate?.sellRate ?? 0);
    const currency = ctx.session.wizard.countryCurrency || brandCountry.country?.currency || 'USD';

    let msg =
      `🎉 <b>Batch #${result.batchId} published</b>\n\n` +
      `📦 ${result.totalPublished} card(s) · ${fmt$(totalFace, currency)} face value` +
      (result.duplicates.length > 0 ? `\n⚠️ ${result.duplicates.length} duplicate(s) skipped` : '') +
      `\n💸 You earn: <b>${fmt$(payout, 'USD')}</b>`;

    const kb = new InlineKeyboard().text('📦 View My Batches', 'my_batches').row().text('➕ Publish More', 'sell_start');

    await renderUI(ctx, msg, { parse_mode: 'HTML', reply_markup: kb, callbackText: '✅ Published' });

    sellerLogger.action('sell', 'bot-publish', `Batch #${result.batchId} publicado via bot: ${result.totalPublished} tarjetas`, {
      userId: ctx.user.id,
      metadata: { batchId: result.batchId, totalPublished: result.totalPublished, duplicates: result.duplicates.length },
    });
  } catch (error: any) {
    sellerLogger.error('Error al publicar batch via bot', {
      userId: ctx.user.id,
      metadata: { brandCountryId },
      error: { name: error.name ?? 'Error', message: error.message },
    });
    await ctx.answerCallbackQuery('Error publishing');
    return renderUI(ctx, `❌ ${escapeHTML(error.message || 'Error publishing batch')}`, {
      reply_markup: new InlineKeyboard().text('⬅️ Back', 'sell_start'),
    });
  }
}
