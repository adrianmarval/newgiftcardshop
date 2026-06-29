import prisma from '@/lib/prisma';
import { InlineKeyboard } from 'grammy';
import { hashCode } from '@/lib/encryption';
import { parseClaimCodes } from '@/lib/utils/claim-code-parser';
import type { ParsedGiftcard } from '@/types';
import type { SellerContext } from '@/bot/shared/types.js';
import { fmt$ } from '@/bot/shared/formatters.js';
import { renderUI, deleteUserInput, escapeHTML } from '@/bot/shared/ui.js';
import { getUserRates } from '@/lib/services/pricing';
import { MAX_BATCH_SIZE } from '@/lib/constants';

// ── Step 1: Elegir Brand ──────────────────────────────────────────────────────

export async function startSellWizard(ctx: SellerContext) {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: { countries: { where: { isActive: true }, include: { country: true } } },
    orderBy: { name: 'asc' },
  });

  await deleteUserInput(ctx);

  const activeBrands = brands.filter((b) => b.countries.length > 0);
  if (activeBrands.length === 0) {
    return renderUI(ctx, '❌ No active brands available. Please contact the administrator.');
  }

  const kb = new InlineKeyboard();
  for (const brand of activeBrands) {
    kb.text(`${brand.icon} ${brand.name}`, `sell_brand_${brand.id}`).row();
  }
  kb.text('❌ Cancel', 'sell_cancel');

  ctx.session.wizard.step = 'idle';
  await prisma.provenanceImage.deleteMany({ where: { batchId: `temp_${ctx.from?.id}` } });

  return renderUI(ctx, '🏷️ <b>Which brand are you publishing?</b>', {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}

// ── Step 2: Choose Country ────────────────────────────────────────────────────

export async function handleBrandSelected(ctx: SellerContext) {
  const brandId = ctx.callbackQuery?.data?.replace('sell_brand_', '');
  if (!brandId) return ctx.answerCallbackQuery();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { countries: { where: { isActive: true }, include: { country: true } } },
  });

  if (!brand) return ctx.answerCallbackQuery('Brand not found');

  ctx.session.wizard.brandId = brand.id;
  ctx.session.wizard.brandName = brand.name;

  const kb = new InlineKeyboard();
  for (const bc of brand.countries) {
    kb.text(`${bc.country.name}`, `sell_country_${bc.country.id}`).row();
  }
  kb.text('⬅️ Back', 'sell_start').row().text('❌ Cancel', 'sell_cancel');

  await renderUI(ctx, `🌍 <b>Country for ${brand.icon} ${escapeHTML(brand.name)}:</b>`, { parse_mode: 'HTML', reply_markup: kb });
}

// ── Step 3: Enter Codes ───────────────────────────────────────────────────────

export async function handleCountrySelected(ctx: SellerContext) {
  const countryId = ctx.callbackQuery?.data?.replace('sell_country_', '');
  if (!countryId) return ctx.answerCallbackQuery();

  const country = await prisma.country.findUnique({ where: { id: countryId } });
  if (!country) return ctx.answerCallbackQuery('Country not found');

  const { brandId } = ctx.session.wizard;
  if (!brandId) return ctx.answerCallbackQuery('Start over with /sell');

  const brandCountry = await prisma.brandCountry.findUnique({
    where: { brandId_countryId: { brandId, countryId } },
  });
  if (!brandCountry) return ctx.answerCallbackQuery('Invalid combination');

  try {
    await getUserRates(ctx.user.id, { brandCountryId: brandCountry.id });
  } catch {
    return ctx.answerCallbackQuery('No tienes tarifa para vender aquí. Contactá al admin.');
  }

  ctx.session.wizard.countryId = country.id;
  ctx.session.wizard.countryName = country.name;
  ctx.session.wizard.countryCurrency = country.currency || 'USD';
  ctx.session.wizard.brandCountryId = brandCountry.id;
  ctx.session.wizard.step = 'awaitingCodes';

  await renderUI(
    ctx,
    `📝 <b>Enter the codes</b> (max ${MAX_BATCH_SIZE})\n\n` +
      `Brand: <b>${escapeHTML(ctx.session.wizard.brandName ?? '')} — ${escapeHTML(country.name)}</b>\n\n` +
      `Format (one per line):\n` +
      `<code>CODE AMOUNT</code>\n` +
      `<code>CODE AMOUNT PIN</code>\n\n` +
      `Example:\n` +
      `<code>ABCD-123456-7890 25</code>\n` +
      `<code>EFGH-098765-4321 50 1234</code>\n\n` +
      ` <i>Maximum ${MAX_BATCH_SIZE} codes per batch.</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('⬅️ Back', `sell_brand_${brandId}`).row().text('❌ Cancel', 'sell_cancel'),
    },
  );
}

// ── Step 4: Parse and confirm ────────────────────────────────────────────────

async function renderSummaryMessage(ctx: SellerContext) {
  const pendingCardsRaw = (ctx.session as any)._pendingCards as string | undefined;
  if (!pendingCardsRaw) return null;
  const validCards: ParsedGiftcard[] = JSON.parse(pendingCardsRaw);

  const pendingErrorsRaw = (ctx.session as any)._pendingErrors as string | undefined;
  const allErrors: string[] = pendingErrorsRaw ? JSON.parse(pendingErrorsRaw) : [];

  const pendingImagesCount = await prisma.provenanceImage.count({
    where: { batchId: `temp_${ctx.from?.id}` },
  });

  const totalFace = validCards.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0);
  const currency = ctx.session.wizard.countryCurrency || 'USD';

  let confirmMsg =
    `✅ <b>PROCESSED: ${validCards.length} valid card(s)</b>\n` +
    `💰 Total value: <b>${fmt$(totalFace, currency)}</b>\n\n` +
    validCards
      .map(
        (c, i) =>
          `${i + 1}. <code>${escapeHTML(c.claimCode)}</code> — ${fmt$(c.amount || '0', currency)}${c.pinCode ? ` (PIN: <code>${escapeHTML(c.pinCode)}</code>)` : ''}`,
      )
      .join('\n') +
    '\n\n';

  if (allErrors.length > 0) {
    confirmMsg +=
      `🚨 <b>WARNING! ISSUES FOUND (${allErrors.length})</b>\n` +
      `<i>These lines will NOT be published:</i>\n` +
      `<code>${escapeHTML(allErrors.join('\n'))}</code>\n\n` +
      ` <b>Do you want to continue with only the valid cards?</b>`;
  } else {
    confirmMsg += `Publish these cards?`;
  }

  const kb = new InlineKeyboard();
  kb.text('✅ Publish', 'sell_confirm').text('❌ Cancel', 'sell_cancel').row();

  if (pendingImagesCount > 0) {
    kb.text(`🗑 Delete Batch Screenshots (${pendingImagesCount})`, 'sell_delete_photos').row();
    kb.text('➕ Add more Screenshots', 'sell_add_photos').row();
  } else {
    kb.text('📸 Upload Batch Screenshots', 'sell_upload_photos').row();
  }

  return { text: confirmMsg, kb };
}

export async function handleCodesText(ctx: SellerContext) {
  if (ctx.session.wizard.step !== 'awaitingCodes') return;

  const text = (ctx.message as any)?.text as string | undefined;
  if (!text) return;

  await deleteUserInput(ctx);

  const { parsed: cards, errors } = parseClaimCodes(text);

  if (cards.length > MAX_BATCH_SIZE) {
    return renderUI(
      ctx,
      `❌ <b>Batch too large.</b>\n\n` +
        `You can only publish up to <b>${MAX_BATCH_SIZE} codes</b> at a time via Telegram to ensure message stability.\n\n` +
        `Please split your batch and try again.`,
      { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('⬅️ Back', 'sell_start') },
    );
  }

  // Validar duplicados en DB
  const { brandCountryId } = ctx.session.wizard;
  const duplicateInDbLines: string[] = [];
  const validCards: ParsedGiftcard[] = [];

  if (cards.length > 0 && brandCountryId) {
    const hashes = cards.map((c) => hashCode(c.claimCode.toUpperCase()));
    const existing = await prisma.giftcard.findMany({
      where: { codeHash: { in: hashes } },
      select: { codeHash: true },
    });
    const existingSet = new Set(existing.map((e) => e.codeHash));

    for (const card of cards) {
      if (existingSet.has(hashCode(card.claimCode.toUpperCase()))) {
        duplicateInDbLines.push(`Line ${card.line}: <code>${escapeHTML(card.claimCode)}</code> already exists in database.`);
      } else {
        validCards.push(card);
      }
    }
  } else {
    validCards.push(...cards);
  }

  if (validCards.length === 0) {
    return renderUI(
      ctx,
      `❌ <b>No valid codes to publish.</b>\n\n` +
        `${errors.length > 0 ? `<b>Parsing errors:</b>\n<code>${escapeHTML(errors.join('\n'))}</code>\n\n` : ''}` +
        `${duplicateInDbLines.length > 0 ? `<b>Duplicates found:</b>\n<code>${escapeHTML(duplicateInDbLines.join('\n'))}</code>\n\n` : ''}` +
        `Please check your list and try again.`,
      { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('⬅️ Back', 'sell_start') },
    );
  }

  const allErrors = [...errors, ...duplicateInDbLines];

  // Guardar en sesión temporalmente
  ctx.session.storedMessageIds = ctx.session.storedMessageIds ?? [];
  (ctx.session as any)._pendingCards = JSON.stringify(validCards);
  (ctx.session as any)._pendingErrors = JSON.stringify(allErrors);

  ctx.session.wizard.step = 'awaitingConfirm';

  const summary = await renderSummaryMessage(ctx);
  if (summary) {
    await renderUI(ctx, summary.text, { parse_mode: 'HTML', reply_markup: summary.kb });
  }
}

// ── Step 4.5: Catch Photos ───────────────────────────────────────────────────

export async function handleUploadPhotosStart(ctx: SellerContext) {
  ctx.session.wizard.step = 'awaitingImages';
  await prisma.provenanceImage.deleteMany({ where: { batchId: `temp_${ctx.from?.id}` } });
  ctx.session.wizard.currentMediaGroupId = undefined;

  const kb = new InlineKeyboard().text('⬅️ Back to Summary', 'sell_photos_done');
  await renderUI(
    ctx,
    `📸 <b>Send your screenshots now.</b> (Total saved: 0)\n\nYou can send multiple photos as an album. When you are finished, click the button below to return to the summary.`,
    { parse_mode: 'HTML', reply_markup: kb },
  );

  if (ctx.callbackQuery?.message) {
    ctx.session.wizard.statusMessageId = ctx.callbackQuery.message.message_id;
  }
}

export async function handleAddMorePhotosStart(ctx: SellerContext) {
  ctx.session.wizard.step = 'awaitingImages';
  ctx.session.wizard.currentMediaGroupId = undefined;

  const total = await prisma.provenanceImage.count({ where: { batchId: `temp_${ctx.from?.id}` } });

  const kb = new InlineKeyboard().text('⬅️ Back to Summary', 'sell_photos_done');
  await renderUI(
    ctx,
    `📸 <b>Send your additional screenshots now.</b> (Total saved: ${total})\n\nYou can send multiple photos as an album. When you are finished, click the button below to return to the summary.`,
    { parse_mode: 'HTML', reply_markup: kb },
  );

  if (ctx.callbackQuery?.message) {
    ctx.session.wizard.statusMessageId = ctx.callbackQuery.message.message_id;
  }
}

export async function handlePhotosDone(ctx: SellerContext) {
  ctx.session.wizard.step = 'awaitingConfirm';
  const summary = await renderSummaryMessage(ctx);
  if (summary) {
    await renderUI(ctx, summary.text, { parse_mode: 'HTML', reply_markup: summary.kb });
  }
}

export async function handleDeletePhotos(ctx: SellerContext) {
  await prisma.provenanceImage.deleteMany({ where: { batchId: `temp_${ctx.from?.id}` } });
  const summary = await renderSummaryMessage(ctx);
  if (summary) {
    await renderUI(ctx, summary.text, { parse_mode: 'HTML', reply_markup: summary.kb, callbackText: '✅ Screenshots deleted' });
  }
}

export async function handleSellPhotos(ctx: SellerContext) {
  if (ctx.session.wizard.step !== 'awaitingImages') return;
  if (!ctx.message?.photo) return;

  await deleteUserInput(ctx);

  // Telegram sends photos in multiple sizes, the last one is the largest
  const photo = ctx.message.photo[ctx.message.photo.length - 1];

  // Guardar en la DB de forma atómica para evitar conflictos en serverless
  await prisma.provenanceImage.create({
    data: {
      batchId: `temp_${ctx.from?.id}`,
      telegramFileId: photo.file_id,
    },
  });

  const total = await prisma.provenanceImage.count({
    where: { batchId: `temp_${ctx.from?.id}` },
  });

  const kb = new InlineKeyboard().text('✅ Done sending photos', 'sell_photos_done');
  const msgText = `📸 <b>Photo received!</b> (Total saved: ${total})\n\nSend more, or click the button below when finished.`;

  await renderUI(ctx, msgText, { parse_mode: 'HTML', reply_markup: kb });
}

// ── Cancel ──────────────────────────────────────────────────────────────────

export async function handleSellCancel(ctx: SellerContext) {
  ctx.session.wizard.step = 'idle';
  (ctx.session as any)._pendingCards = undefined;
  (ctx.session as any)._pendingErrors = undefined;
  await prisma.provenanceImage.deleteMany({ where: { batchId: `temp_${ctx.from?.id}` } });

  await renderUI(ctx, '❌ Operation cancelled.', {
    reply_markup: new InlineKeyboard().text('🏠 Main Menu', 'start').row().text('➕ Publish Giftcards', 'sell_start'),
  });
}
