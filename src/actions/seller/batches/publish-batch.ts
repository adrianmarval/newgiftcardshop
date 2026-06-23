'use server';

import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { encrypt, hashCode, encryptBuffer } from '@/lib/encryption';
import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';
import { getUserRates } from '@/services/pricing.service';
import { GiftcardEscalationService } from '@/lib/services/giftcard-escalation';
import { notificationService } from '@/lib/notifications/notification.service';
import { MAX_BATCH_SIZE } from '@/lib/constants';

const publishBatchInputSchema = z.object({
  cards: z.array(
    z.object({
      amount: z.string(),
      claimCode: z.string(),
      pinCode: z.string().optional(),
      compressedImageData: z.string().optional(),
    }),
  ),
  brandId: z.string(),
  countryId: z.string(),
  unmatchedImages: z.array(z.object({ data: z.string() })).optional(),
});

const publishBatchOutputSchema = z.union([
  z.object({
    success: z.literal(true),
    batchId: z.number(),
    duplicates: z.array(z.string()),
  }),
  z.object({ error: z.string() }),
]);

export const publishBatch = sellerActionClient
  .inputSchema(publishBatchInputSchema)
  .outputSchema(publishBatchOutputSchema)
  .useValidated(async ({ parsedInput: { brandId, cards, countryId, unmatchedImages }, ctx, next }) => {
    if (!brandId || !countryId) throw new ActionError('Brand and country are required');

    const validCards = cards.filter((card) => {
      const amount = parseFloat(card.amount);
      return !isNaN(amount) && amount > 0 && card.claimCode.trim().length > 0;
    });

    if (validCards.length === 0) {
      throw new ActionError('No valid cards were provided for processing.');
    }

    if (validCards.length > MAX_BATCH_SIZE) {
      throw new ActionError(`Batch exceeds maximum size of ${MAX_BATCH_SIZE} cards.`);
    }

    const normalizedCards = validCards.map((card) => {
      const normalized = normalizeClaimCode(card.claimCode.trim());
      return {
        ...card,
        claimCode: normalized ? formatClaimCodeCanonical(normalized) : card.claimCode.trim().toUpperCase(),
      };
    });

    const codesToCheck = normalizedCards.map((c) => c.claimCode);
    const codeHashes = codesToCheck.map((c) => hashCode(c.toUpperCase()));

    const brandCountry = await prisma.brandCountry.findUnique({
      where: {
        brandId_countryId: { brandId, countryId },
      },
    });

    if (!brandCountry) {
      throw new ActionError('Invalid brand-country combination');
    }

    const existingInDb = await prisma.giftcard.findMany({
      where: {
        codeHash: { in: codeHashes },
      },
      select: { codeHash: true },
    });

    if (existingInDb.length > 0) {
      throw new ActionError(`${existingInDb.length} code(s) already exist in inventory`);
    }

    const requestDeduped: Array<{
      amount: string;
      claimCode: string;
      pinCode?: string;
      compressedImageData?: string;
    }> = [];
    const requestNormalizedSeen = new Set<string>();

    for (const card of normalizedCards) {
      const key = card.claimCode.toUpperCase();
      if (requestNormalizedSeen.has(key)) continue;
      requestNormalizedSeen.add(key);
      requestDeduped.push(card);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: { id: true },
    });

    if (!dbUser) throw new ActionError('User not found in the system.');

    const hashedCodes = requestDeduped.map((card) => hashCode(card.claimCode));

    const existingCards = await prisma.giftcard.findMany({
      where: { codeHash: { in: hashedCodes } },
      select: { codeHash: true },
    });
    const existingHashes = new Set(existingCards.map((c) => c.codeHash));

    const duplicates: string[] = [];
    const uniqueCards: Array<{
      amount: string;
      claimCode: string;
      pinCode?: string;
      compressedImageData?: string;
    }> = [];

    requestDeduped.forEach((card, i) => (existingHashes.has(hashedCodes[i]) ? duplicates.push(card.claimCode) : uniqueCards.push(card)));

    if (uniqueCards.length === 0) throw new ActionError('All provided cards already exist in the inventory.');

    return next({ ctx: { uniqueCards, duplicates, dbUser, brandCountryId: brandCountry.id, unmatchedImages } });
  })
  .action(async ({ ctx }) => {
    const { uniqueCards, duplicates, dbUser, brandCountryId, unmatchedImages } = ctx;

    let sellRateSnapshot: Prisma.Decimal;
    try {
      const rates = await getUserRates(dbUser.id, { brandCountryId });
      sellRateSnapshot = rates.sellRate as Prisma.Decimal;
    } catch (error) {
      console.error(error);
      throw new ActionError('You do not have a rate assigned for this brand and country. Contact the administrator.');
    }

    const escalationService = new GiftcardEscalationService();
    const initialTier = await escalationService.getInitialTier(brandCountryId);
    console.log({ initialTier });

    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.giftcardBatch.create({
        data: {
          userId: dbUser.id,
          sellRate: sellRateSnapshot,
          isPaid: false,
        },
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
            ownerId: dbUser.id,
            inStock: true,
            status: 'UNUSED',
            batchId: createdBatch.id,
            brandCountryId,
            ...(initialTier !== null ? { escalationTier: initialTier } : {}),
          },
        });

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

    notificationService
      .notifyBuyersStockAvailable(brandCountryId, initialTier, batch.id)
      .catch((err) => console.error('[publish-batch] Error al notificar buyers (non-blocking):', err));

    return {
      success: true as const,
      batchId: batch.id,
      duplicates,
    };
  });
