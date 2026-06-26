// ─────────────────────────────────────────────────────────────────────────────
// Batch Publish Service — Shared between web action and seller bot
// Core logic: validation, dedup, DB transaction, notifications
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { encrypt, hashCode, encryptBuffer } from '@/lib/encryption';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';
import { getUserRates } from '@/lib/services/pricing/pricing';
import { getInitialTier } from './escalation';
import { notifyBuyersStockAvailable } from '@/lib/notifications';
import { MAX_BATCH_SIZE } from '@/lib/constants';
import type { PublishCardInput, PublishResult, PublishContext } from '@/types';

/**
 * Validates, deduplicates, and persists a batch of giftcards.
 * Shared between the web publish-batch action and the seller bot.
 */
export async function publishBatch(ctx: PublishContext): Promise<PublishResult> {
  const { userId, brandId, countryId, cards, unmatchedImages } = ctx;

  if (!brandId || !countryId) throw new Error('Brand and country are required');

  // Filter valid cards
  const validCards = cards.filter((card) => {
    const amount = parseFloat(card.amount);
    return !isNaN(amount) && amount > 0 && card.claimCode.trim().length > 0;
  });

  if (validCards.length === 0) throw new Error('No valid cards were provided for processing.');
  if (validCards.length > MAX_BATCH_SIZE) throw new Error(`Batch exceeds maximum size of ${MAX_BATCH_SIZE} cards.`);

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
  if (!brandCountry) throw new Error('Invalid brand-country combination');

  // DB dedup check (first pass)
  const codeHashes = normalizedCards.map((c) => hashCode(c.claimCode));
  const existingInDb = await prisma.giftcard.findMany({
    where: { codeHash: { in: codeHashes } },
    select: { codeHash: true },
  });
  if (existingInDb.length > 0) throw new Error(`${existingInDb.length} code(s) already exist in inventory`);

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
  if (!dbUser) throw new Error('User not found in the system.');

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

  if (uniqueCards.length === 0) throw new Error('All provided cards already exist in the inventory.');

  // Get sell rate
  let sellRateSnapshot: Prisma.Decimal;
  try {
    const rates = await getUserRates(userId, { brandCountryId: brandCountry.id });
    sellRateSnapshot = rates.sellRate as Prisma.Decimal;
  } catch (error) {
    console.error(error);
    throw new Error('You do not have a rate assigned for this brand and country. Contact the administrator.');
  }

  // Get initial escalation tier
  const initialTier = await getInitialTier(brandCountry.id);

  // Transaction: create batch + cards + images
  const batch = await prisma.$transaction(async (tx) => {
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

  // Non-blocking: notify buyers
  notifyBuyersStockAvailable(brandCountry.id, initialTier, batch.id)
    .catch((err) => console.error('[publish-batch] Error al notificar buyers (non-blocking):', err));

  return { batchId: batch.id, duplicates, totalPublished: uniqueCards.length };
}
