'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { encrypt, hashCode, encryptBuffer } from '@/lib/encryption';
import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { publishBatchSchema, publishBatchOutputSchema } from '@/types/domain/seller';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';

export const publishBatch = sellerActionClient
  .inputSchema(publishBatchSchema)
  .outputSchema(publishBatchOutputSchema)
  .useValidated(async ({ parsedInput: { brandId, cards, countryId }, ctx, next }) => {
    if (!brandId || !countryId) throw new ActionError('Brand and country are required');

    const validCards = cards.filter((card) => {
      const amount = parseFloat(card.amount);
      return !isNaN(amount) && amount > 0 && card.claimCode.trim().length > 0;
    });

    if (validCards.length === 0) {
      throw new ActionError('No valid cards were provided for processing.');
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

    const existingInDb = await prisma.giftcard.findMany({
      where: {
        codeHash: { in: codeHashes },
        brandId,
        countryId,
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
      select: { sellRate: true },
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

    return next({ ctx: { uniqueCards, duplicates, dbUser } });
  })
  .action(async ({ parsedInput: { brandId, countryId }, ctx }) => {
    const { uniqueCards, duplicates, dbUser } = ctx;

    const sellRateSnapshot = dbUser.sellRate;

    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.giftcardBatch.create({
        data: {
          userId: ctx.auth.user.id,
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
            ownerId: ctx.auth.user.id,
            inStock: true,
            status: 'UNUSED',
            batchId: createdBatch.id,
            brandId,
            countryId,
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
            },
          });
        }
      }

      return createdBatch;
    });

    return {
      success: true as const,
      batchId: batch.id,
      duplicates,
    };
  });
