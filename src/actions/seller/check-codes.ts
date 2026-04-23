'use server';

import prisma from '@/lib/prisma';
import { decrypt, hashCode } from '@/lib/encryption';
import { sellerActionClient } from '@/lib/safe-action';
import { checkExistingCodesSchema, checkExistingCodesOutputSchema } from '@/types/domain/seller';
import { normalizeClaimCode, formatClaimCodeCanonical } from '@/lib/utils/claim-code-parser';

export const checkExistingCodes = sellerActionClient
  .inputSchema(checkExistingCodesSchema)
  .outputSchema(checkExistingCodesOutputSchema)
  .useValidated(async ({ parsedInput: { codes, brandId, countryId }, next }) => {
    if (codes.length === 0) {
      return next({ ctx: { existingCodes: [] } });
    }

    const formattedCodes = codes.map((code) => {
      const normalized = normalizeClaimCode(code.trim());
      return normalized ? formatClaimCodeCanonical(normalized) : code.trim().toUpperCase();
    });

    const codeHashes = formattedCodes.map((c) => hashCode(c.toUpperCase()));

    const existingInDb = await prisma.giftcard.findMany({
      where: {
        codeHash: { in: codeHashes },
        brandId,
        countryId,
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
    return {
      success: true as const,
      existingCodes: ctx.existingCodes,
    };
  });
