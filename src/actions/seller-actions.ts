'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { encrypt, decrypt, hashCode, encryptBuffer } from '@/lib/encryption';
import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import {
  publishBatchSchema,
  publishBatchOutputSchema,
  getSellerBatchesOutputSchema,
  getSellerRateOutputSchema,
} from '@/types/seller/schemas';
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

    // ── Normalize codes for DB check ───────────────────────────────────────
    const normalizedCards = validCards.map((card) => {
      const normalized = normalizeClaimCode(card.claimCode.trim());
      return {
        ...card,
        claimCode: normalized ? formatClaimCodeCanonical(normalized) : card.claimCode.trim().toUpperCase(),
      };
    });

    // ── Check for existing codes in DB (by hash) ─────────────────────────────
    const codeHashes = normalizedCards.map((c) => hashCode(c.claimCode.toUpperCase()));
    const existingInDb = await prisma.giftcard.findMany({
      where: {
        codeHash: { in: codeHashes },
        brandId,
        countryId,
        status: { notIn: ['INVALID', 'DEACTIVATED'] },
      },
      select: { codeHash: true, status: true },
    });

    if (existingInDb.length > 0) {
      throw new ActionError(`${existingInDb.length} code(s) already exist in inventory with this brand/country`);
    }

    // ── Server-side intra-request dedup ───────────────────────────────────���──
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
    // ─────────────────────────────────────────────────────────────────────────

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

      // Create giftcards individually to get their IDs for ProvenanceImage linking
      for (const card of uniqueCards) {
        // claimCode is already canonical (normalized + formatted) from the middleware step above
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

        // Create ProvenanceImage — encrypt the compressed image before storing
        if (card.compressedImageData) {
          const rawBuffer = Buffer.from(card.compressedImageData, 'base64');
          const { data: encryptedImageBuffer } = encryptBuffer(rawBuffer);
          await tx.provenanceImage.create({
            data: {
              data: new Uint8Array(encryptedImageBuffer),
              mimeType: 'image/jpeg',
              size: rawBuffer.length, // Original size for audit
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

export const getSellerBatches = sellerActionClient.outputSchema(getSellerBatchesOutputSchema).action(async ({ ctx }) => {
  const batches = await prisma.giftcardBatch.findMany({
    where: { userId: ctx.auth.user.id },
    include: {
      giftcards: { include: { brand: true, country: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return {
    success: true as const,
    batches: batches.map((batch) => {
      const sellRate = Number(batch.sellRate);
      const giftcards = batch.giftcards.map((card) => {
        let claimCode = card.claimCode;
        let pinCode = card.pinCode ?? null;
        try {
          claimCode = decrypt(card.claimCode);
        } catch {
          // Legacy unencrypted data — return raw value
        }
        if (card.pinCode) {
          try {
            pinCode = decrypt(card.pinCode);
          } catch {
            // Legacy unencrypted data — return raw value
            pinCode = card.pinCode;
          }
        }
        return {
          id: card.id,
          claimCode,
          pinCode,
          amount: Number(card.amount),
          status: card.status,
          isConfirmed: card.isConfirmed,
          reportedAmount: card.reportedAmount ? Number(card.reportedAmount) : null,
          orderId: card.orderId,
          brand: {
            name: card.brand.name,
            icon: card.brand.icon,
            image: card.brand.image,
          },
          country: card.country
            ? {
                name: card.country.name,
                code: card.country.code,
              }
            : null,
        };
      });
      // Compute effective total server-side (only confirmed cards contribute)
      // USED → face amount, WRONG_AMOUNT → reportedAmount, INVALID/ALREADY_USED/DEACTIVATED → $0
      const effectiveTotal = giftcards.reduce((sum, g) => {
        if (!g.isConfirmed) return sum;
        if (g.status === 'USED') return sum + g.amount;
        if (g.status === 'WRONG_AMOUNT') return sum + (g.reportedAmount || 0);
        return sum;
      }, 0);
      const estimatedPayout = effectiveTotal * sellRate;
      return {
        id: batch.id,
        userId: batch.userId,
        sellRate,
        isPaid: batch.isPaid,
        createdAt: batch.createdAt.toISOString(),
        giftcards,
        payments: batch.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          balanceAfter: Number(payment.balanceAfter),
          status: payment.status,
          createdAt: payment.createdAt.toISOString(),
        })),
        effectiveTotal,
        estimatedPayout,
      };
    }),
  };
});

export const getSellerRate = sellerActionClient.outputSchema(getSellerRateOutputSchema).action(async ({ ctx }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.auth.user.id },
    select: { sellRate: true },
  });
  return {
    success: true as const,
    rate: dbUser?.sellRate ? dbUser.sellRate.toNumber() : 0.75,
  };
});
