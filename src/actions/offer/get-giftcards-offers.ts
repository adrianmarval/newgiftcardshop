'use server';

import { GiftcardParamsFilters } from '@/interfaces/filter-interface';
import { GiftcardOffer } from '@/interfaces/giftcard-interface';
import { connectDb } from '@/libs/mongodb';
import Giftcard from '@/models/Giftcard';

export const getGiftcardOffers = async (filters?: GiftcardParamsFilters): Promise<GiftcardOffer[]> => {
  try {
    await connectDb();

    const query: any = { status: 'published' };

    filters && Object.entries(filters).forEach(([key, value]) => value && (query[key] = { $in: value }));

    const filteredOffers = (await Giftcard.find(query).lean()) as GiftcardOffer[];

    return filteredOffers.map((offer) => ({ ...offer, _id: __dirname.toString() }));
  } catch (error) {
    console.log(error);
    return [];
  }
};
