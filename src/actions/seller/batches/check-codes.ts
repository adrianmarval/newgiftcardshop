'use server';

import prisma from '@/lib/prisma';
import { hashCode } from '@/lib/encryption';
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

    // Mapa hash → código formateado DEL INPUT: el caller ya posee los códigos,
    // solo necesita saber cuáles existen. NUNCA desencriptar los claim codes
    // de la DB para responder (y el viejo catch devolvía el ciphertext crudo).
    const hashToInputCode = new Map(formattedCodes.map((c) => [hashCode(c.toUpperCase()), c] as const));

    const brandCountry = await prisma.brandCountry.findUnique({
      where: { brandId_countryId: { brandId, countryId } },
      select: { id: true },
    });

    if (!brandCountry) {
      return next({ ctx: { existingCodes: [] } });
    }

    const existingInDb = await prisma.giftcard.findMany({
      where: {
        codeHash: { in: [...hashToInputCode.keys()] },
      },
      select: { codeHash: true },
    });

    const existingCodes: string[] = [];
    for (const dbCard of existingInDb) {
      const inputCode = dbCard.codeHash ? hashToInputCode.get(dbCard.codeHash) : undefined;
      if (inputCode) existingCodes.push(inputCode);
    }

    return next({ ctx: { existingCodes } });
  })
  .action(async ({ ctx }) => {
    return { success: true as const, existingCodes: ctx.existingCodes };
  });
