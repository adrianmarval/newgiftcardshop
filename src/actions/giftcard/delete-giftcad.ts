'use server';

import { connectDb } from '@/libs/mongodb';
import Giftcard from '@/models/Giftcard';
import { revalidatePath } from 'next/cache';

export const deleteGiftcard = async (id: string) => {
  try {
    await connectDb();

    const giftcard = await Giftcard.findById(id);

    if (!giftcard) {
      throw new Error('Giftcard no encontrada');
    }

    if (giftcard.status !== 'published' && giftcard.status !== 'paused') {
      throw new Error(`No se puede eliminar la tarjeta debido a su estado: ${giftcard.status}`);
    }

    await giftcard.deleteOne();

    revalidatePath('/dashboard/sell/giftcards');
    return { error: null };
  } catch (error) {
    console.error(error);
    revalidatePath('/dashboard/sell/giftcards');
    return error instanceof Error ? { error: error.message } : { error: 'Ha ocurrido un error.' };
  }
};
