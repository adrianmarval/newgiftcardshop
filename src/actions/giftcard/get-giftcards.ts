'use server';

import Giftcard from '@/models/Giftcard';
import { Giftcard as GiftcardInterface } from '@/interfaces/giftcard-interface';
import { connectDb } from '@/libs/mongodb';

export const getGiftcards = async (): Promise<GiftcardInterface[]> => {
  try {
    await connectDb();
    const giftcards: GiftcardInterface[] = await Giftcard.find({}).lean();
    return giftcards;
  } catch (error) {
    console.log(error);
    return [];
  }
};
