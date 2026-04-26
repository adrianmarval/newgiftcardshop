'use server';

import { findGiftcardCombination } from '@/lib/browse-giftcards';
import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { searchGiftcardSchema, searchGiftcardsOutputSchema } from '@/types/application/buy-flow';

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardSchema)
  .outputSchema(searchGiftcardsOutputSchema)
  .action(async ({ parsedInput: { brandId, countryId, amount } }) => {
    const brandCountry = await prisma.brandCountry.findUnique({
      where: { brandId_countryId: { brandId, countryId } },
      select: { id: true },
    });
    if (!brandCountry) {
      return { success: true as const, giftcards: [] };
    }
    const giftcards = await prisma.giftcard.findMany({
      where: {
        brandCountryId: brandCountry.id,
        inStock: true,
        status: 'UNUSED',
      },
    });
    const selectedGiftcards = findGiftcardCombination(giftcards, amount);
    return {
      success: true as const,
      giftcards: selectedGiftcards.selectedCards.map((card) => ({
        id: card.id,
        brand: card.brandCountryId,
        amount: card.amount.toNumber(),
        status: 'UNUSED' as const,
      })),
    };
  });
