'use server';

import prisma from '@/lib/prisma';
import { decrypt, hashCode } from '@/lib/encryption';
import { sellerActionClient } from '@/lib/safe-action';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';
import { checkCodesInputSchema, checkCodesOutputSchema } from './schemas';

export const checkCodes = sellerActionClient
  .inputSchema(checkCodesInputSchema)
  .outputSchema(checkCodesOutputSchema)
  .useValidated(async ({ parsedInput: { codes, brandId, countryId }, next }) => {
    if (codes.length === 0) {
      return next({ ctx: { existingCodes: [] } });
    }

    const formattedCodes = codes.map((code) => {
      const normalized = normalizeClaimCode(code.trim());
      return normalized ? formatClaimCodeCanonical(normalized) : code.trim().toUpperCase();
    });

    const codeHashes = formattedCodes.map((c) => hashCode(c.toUpperCase()));

    const brandCountry = await prisma.brandCountry.findUnique({
      where: { brandId_countryId: { brandId, countryId } },
      select: { id: true },
    });

    if (!brandCountry) {
      return next({ ctx: { existingCodes: [] } });
    }

    const existingInDb = await prisma.giftcard.findMany({
      where: {
        codeHash: { in: codeHashes },
        brandCountryId: brandCountry.id,
      },
      select: { claimCode: true },
    });

    const existingCodes: string[] = [];
    for (const dbCard of existingInDb) {
      try {
        const decrypted = decrypt(dbCard.claimCode);
        existingCodes.push(decrypted);
      } catch {
        existingCodes.push(dbCard.claimCode);
      }
    }

    return next({ ctx: { existingCodes } });
  })
  .action(async ({ ctx }) => {
    return { success: true as const, existingCodes: ctx.existingCodes };
  });