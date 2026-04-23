'use server';

import { findGiftcardCombination } from '@/lib/browse-giftcards';
import prisma from '@/lib/prisma';
import { buyerActionClient } from '@/lib/safe-action';
import { searchGiftcardSchema, searchGiftcardsOutputSchema } from '@/types/application/buy-flow';

export const searchGiftcards = buyerActionClient
  .inputSchema(searchGiftcardSchema)
  .outputSchema(searchGiftcardsOutputSchema)
  .action(async ({ parsedInput: { brandId, countryId, amount } }) => {
    const giftcards = await prisma.giftcard.findMany({
      where: {
        brandId,
        countryId,
        inStock: true,
        status: 'UNUSED',
      },
    });
    const selectedGiftcards = findGiftcardCombination(giftcards, amount);
    return {
      success: true as const,
      giftcards: selectedGiftcards.selectedCards.map((card) => ({
        id: card.id,
        brand: card.brandId,
        amount: card.amount.toNumber(),
        status: 'UNUSED' as const,
      })),
    };
  });
