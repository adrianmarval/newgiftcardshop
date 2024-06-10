'use server';

import { connectDb } from '@/libs/mongodb';
import Giftcard from '@/models/Giftcard';
import { revalidatePath } from 'next/cache';

// Explicit Type for the giftcard Input
export const deleteGiftcard = async (id: string) => {
  try {
    await connectDb();
    await Giftcard.findByIdAndDelete(id);
    revalidatePath('/dashboard/sell/giftcards');
    return { error: null, successMessage: 'Se elimino la tarjeta de regalo' };
  } catch (error) {
    console.log(error);
    return { error: 'No se pudo eliminar la tarjeta de regalo', successMessage: null };
  }
};
