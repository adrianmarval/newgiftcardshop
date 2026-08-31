// ─────────────────────────────────────────────────────────────────────────────
// Batch Publish Service — Shared between web action and seller bot
// Core logic: validation, dedup, DB transaction, notifications
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { encrypt, hashCode, encryptBuffer } from '@/lib/encryption';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';
import { getUserRates } from '@/lib/services/pricing';
import { getInitialTier } from './escalation';
import { notifyBuyersStockAvailable } from '@/lib/notifications';
import { publishToRole, publishToUser } from '@/lib/realtime/bus';
import { MAX_BATCH_SIZE, WALLET_MIN_PAYOUT_EXTERNAL } from '@/lib/constants';
import { validateAmountsAgainstRange, buildAmountRangeErrorMessage } from '@/lib/utils/amount-range-validator';
import { logger } from '@/lib/logger';
import type { PublishCardInput, PublishResult, PublishContext } from '@/types';

/**
 * Validates, deduplicates, and persists a batch of giftcards.
 * Shared between the web publish-batch action and the seller bot.
 */
export async function publishBatch(ctx: PublishContext): Promise<PublishResult> {
  const { userId, brandId, countryId, cards, unmatchedImages } = ctx;

  if (!brandId || !countryId) {
    logger.warn('publishBatch: brand y country requeridos', { flow: 'sell', action: 'publish-batch', userId });
    throw new Error('Brand and country are required');
  }

  // Filter valid cards
  const validCards = cards.filter((card) => {
    const amount = parseFloat(card.amount);
    return !isNaN(amount) && amount > 0 && card.claimCode.trim().length > 0;
  });

  if (validCards.length === 0) {
    logger.warn('publishBatch: sin tarjetas válidas', { flow: 'sell', action: 'publish-batch', userId, metadata: { totalCards: cards.length } });
    throw new Error('No valid cards were provided for processing.');
  }
  if (validCards.length > MAX_BATCH_SIZE) {
    logger.warn('publishBatch: batch excede tamaño máximo', { flow: 'sell', action: 'publish-batch', userId, metadata: { validCards: validCards.length, max: MAX_BATCH_SIZE } });
    throw new Error(`Batch exceeds maximum size of ${MAX_BATCH_SIZE} cards.`);
  }

  // Normalize claim codes
  const normalizedCards = validCards.map((card) => {
    const normalized = normalizeClaimCode(card.claimCode.trim());
    return {
      ...card,
      claimCode: normalized ? formatClaimCodeCanonical(normalized) : card.claimCode.trim().toUpperCase(),
    };
  });

  // Find brand-country
  const brandCountry = await prisma.brandCountry.findUnique({
    where: { brandId_countryId: { brandId, countryId } },
  });
  if (!brandCountry) {
    logger.warn('publishBatch: combinación brand-country inválida', { flow: 'sell', action: 'publish-batch', userId, metadata: { brandId, countryId } });
    throw new Error('Invalid brand-country combination');
  }

  // Validate claim code format using brand-country pattern (or default 14-15 alphanumeric)
  const codeRegex = brandCountry.claimCodePattern
    ? new RegExp(brandCountry.claimCodePattern)
    : /^[A-Z0-9]{14,15}$/;
  const invalidCodes = normalizedCards.filter((c) => {
    const raw = c.claimCode.replace(/[- ]/g, '');
    return !codeRegex.test(raw);
  });
  if (invalidCodes.length > 0) {
    throw new Error(
      `${invalidCodes.length} code(s) have invalid format. Claim codes must match pattern: ${codeRegex.source}`,
    );
  }

  // Validate card amounts against brand-country limits
  if (brandCountry.minAmount !== null || brandCountry.maxAmount !== null) {
    const minAmount = brandCountry.minAmount !== null ? Number(brandCountry.minAmount) : null;
    const maxAmount = brandCountry.maxAmount !== null ? Number(brandCountry.maxAmount) : null;
    const violations = validateAmountsAgainstRange(
      normalizedCards.map((c, i) => ({ ref: String(i), claimCode: c.claimCode, amount: c.amount })),
      { minAmount, maxAmount },
    );
    if (violations.length > 0) {
      const minMsg = minAmount !== null ? `min $${minAmount}` : '';
      const maxMsg = maxAmount !== null ? `max $${maxAmount}` : '';
      const range = [minMsg, maxMsg].filter(Boolean).join(', ');
      logger.warn('publishBatch: tarjetas fuera de rango permitido', {
        flow: 'sell',
        action: 'publish-batch',
        userId,
        metadata: {
          invalidCount: violations.length,
          range,
          offenders: violations.map((v) => ({ claimCode: v.claimCode, amount: v.amount, violation: v.violation })),
        },
      });
      throw new Error(buildAmountRangeErrorMessage(violations, { minAmount, maxAmount }));
    }
  }

  // DB dedup check (first pass)
  const codeHashes = normalizedCards.map((c) => hashCode(c.claimCode));
  const existingInDb = await prisma.giftcard.findMany({
    where: { codeHash: { in: codeHashes } },
    select: { codeHash: true },
  });
  if (existingInDb.length > 0) {
    logger.warn('publishBatch: códigos duplicados en DB', { flow: 'sell', action: 'publish-batch', userId, metadata: { duplicateCount: existingInDb.length } });
    throw new Error(`${existingInDb.length} code(s) already exist in inventory`);
  }

  // Request-level dedup
  const requestDeduped: PublishCardInput[] = [];
  const requestNormalizedSeen = new Set<string>();
  for (const card of normalizedCards) {
    const key = card.claimCode.toUpperCase();
    if (requestNormalizedSeen.has(key)) continue;
    requestNormalizedSeen.add(key);
    requestDeduped.push(card);
  }

  // Verify user exists
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!dbUser) {
    logger.warn('publishBatch: usuario no encontrado', { flow: 'sell', action: 'publish-batch', userId });
    throw new Error('User not found in the system.');
  }

  // Verify wallet is configured before publishing
  const paymentMethod = await prisma.paymentMethod.findUnique({ where: { userId } });
  if (!paymentMethod) {
    logger.warn('publishBatch: wallet no configurada', { flow: 'sell', action: 'publish-batch', userId });
    throw new Error('You must configure your USDT wallet before publishing cards. Go to Settings > Payment Method to set it up.');
  }

  // DB dedup check (second pass, after request-level dedup)
  const hashedCodes = requestDeduped.map((card) => hashCode(card.claimCode));
  const existingCards = await prisma.giftcard.findMany({
    where: { codeHash: { in: hashedCodes } },
    select: { codeHash: true },
  });
  const existingHashes = new Set(existingCards.map((c) => c.codeHash));

  const duplicates: string[] = [];
  const uniqueCards: PublishCardInput[] = [];
  requestDeduped.forEach((card, i) =>
    existingHashes.has(hashedCodes[i]) ? duplicates.push(card.claimCode) : uniqueCards.push(card),
  );

  if (uniqueCards.length === 0) {
    logger.warn('publishBatch: todas las tarjetas son duplicadas', { flow: 'sell', action: 'publish-batch', userId, metadata: { duplicates: duplicates.length } });
    throw new Error('All provided cards already exist in the inventory.');
  }

  // Get sell rate
  let sellRateSnapshot: Prisma.Decimal;
  try {
    const rates = await getUserRates(userId, { brandCountryId: brandCountry.id });
    sellRateSnapshot = rates.sellRate as Prisma.Decimal;
  } catch (error) {
    logger.error('Error al obtener tasa para publicar batch', {
      userId,
      flow: 'sell',
      action: 'publish-batch',
      metadata: { brandCountryId: brandCountry.id },
      error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : 'Unknown' },
    });
    throw new Error('You do not have a rate assigned for this brand and country. Contact the administrator.');
  }

  // Min payout validation for external wallets (payout = totalAmount × sellRate)
  if (!paymentMethod.isBinanceWallet) {
    const totalAmount = uniqueCards.reduce((sum, card) => sum + parseFloat(card.amount), 0);
    const estimatedPayout = totalAmount * Number(sellRateSnapshot);
    if (estimatedPayout < WALLET_MIN_PAYOUT_EXTERNAL) {
      logger.warn('publishBatch: pago estimado insuficiente para wallet externa', {
        flow: 'sell',
        action: 'publish-batch',
        userId,
        metadata: { totalAmount, sellRate: Number(sellRateSnapshot), estimatedPayout, min: WALLET_MIN_PAYOUT_EXTERNAL },
      });
      throw new Error(
        `External wallets require a minimum estimated payout of $${WALLET_MIN_PAYOUT_EXTERNAL}. ` +
          `Your batch total: $${totalAmount.toFixed(2)} × ${(Number(sellRateSnapshot) * 100).toFixed(1)}% = $${estimatedPayout.toFixed(2)} payout. ` +
          `Add more cards or use a Binance wallet.`,
      );
    }
  }

  // Get initial escalation tier
  const initialTier = await getInitialTier(brandCountry.id);

  // Transaction: create batch + cards + images
  let batch;
  try {
    batch = await prisma.$transaction(async (tx) => {
    const createdBatch = await tx.giftcardBatch.create({
      data: { userId, sellRate: sellRateSnapshot, isPaid: false },
    });

    for (const card of uniqueCards) {
      const encryptedClaimCode = encrypt(card.claimCode);
      const codeHash = hashCode(card.claimCode);
      const encryptedPinCode = card.pinCode && card.pinCode.trim().length > 0 ? encrypt(card.pinCode.trim()) : null;

      const createdGiftcard = await tx.giftcard.create({
        data: {
          claimCode: encryptedClaimCode,
          codeHash,
          pinCode: encryptedPinCode,
          amount: new Prisma.Decimal(parseFloat(card.amount)),
          ownerId: userId,
          inStock: true,
          status: 'UNUSED',
          batchId: createdBatch.id,
          brandCountryId: brandCountry.id,
          ...(initialTier !== null ? { escalationTier: initialTier } : {}),
        },
      });

      // Per-card provenance images (web only — bot doesn't send these)
      if (card.compressedImageData) {
        const rawBuffer = Buffer.from(card.compressedImageData, 'base64');
        const { data: encryptedImageBuffer } = encryptBuffer(rawBuffer);
        await tx.provenanceImage.create({
          data: {
            data: new Uint8Array(encryptedImageBuffer),
            mimeType: 'image/jpeg',
            size: rawBuffer.length,
            giftcardId: createdGiftcard.id,
            batchId: createdBatch.id.toString(),
          },
        });
      }
    }

    // Unmatched images (batch-level)
    if (unmatchedImages && unmatchedImages.length > 0) {
      for (const img of unmatchedImages) {
        const rawBuffer = Buffer.from(img.data, 'base64');
        const { data: encryptedImageBuffer } = encryptBuffer(rawBuffer);
        await tx.provenanceImage.create({
          data: {
            data: new Uint8Array(encryptedImageBuffer),
            mimeType: 'image/jpeg',
            size: rawBuffer.length,
            batchId: createdBatch.id.toString(),
          },
        });
      }
    }

    return createdBatch;
  });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error(
        'Some codes already exist in the system. This may have happened if you published from another session. Please check your batches and try again with only the new codes.',
      );
    }
    throw err;
  }

  // Invalidación realtime: el seller ve su batch al instante (web y bot
  // pasan por acá) y el stock sube para todos los buyers conectados.
  // La vista de cada buyer recomputa su monto ACCESIBLE server-side — el
  // socket solo lleva la señal, nunca data.
  publishToUser(userId, ['batches', 'stats']);
  publishToRole('BUYER', ['availability']);
  publishToRole('ADMIN', ['batches']);

  // Non-blocking: notify buyers
  notifyBuyersStockAvailable(brandCountry.id, initialTier, batch.id)
    .catch((err) => logger.error('Error al notificar buyers post-publish (non-blocking)', {
      flow: 'sell',
      action: 'publish-batch',
      userId,
      metadata: { batchId: batch.id, brandCountryId: brandCountry.id },
      error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : 'Unknown' },
    }));

  return { batchId: batch.id, duplicates, totalPublished: uniqueCards.length };
}
