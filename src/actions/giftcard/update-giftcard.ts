'use server';

import { revalidatePath } from 'next/cache';
import { connectDb } from '@/libs/mongodb';
import Giftcard from '@/models/Giftcard';
import { Giftcard as GiftcardInterface } from '@/interfaces/giftcard-interface';

export const toggleIsPublished = async (id: string, status: GiftcardInterface['status']) => {
  try {
    await connectDb();

    const giftcard = await Giftcard.findById(id);

    if (!giftcard) throw new Error('Giftcard no encontrada');

    if (giftcard.status !== 'published' && giftcard.status !== 'paused')
      throw new Error(`No se puede pausar la publicacion debido a su estado: ${giftcard.status}`);

    giftcard.status = status;
    await giftcard.save();
    revalidatePath('/dashboard/sell/giftcards');
    return { error: null, successMesage: status === 'published' && 'Tarjeta de regalo publicada. Ahora es visible para los compradores' };
  } catch (error) {
    console.log(error);
    revalidatePath('/dashboard/sell/giftcards');
    return error instanceof Error
      ? { error: error.message, successMessage: null }
      : { error: 'Ha ocurrido un error.', successMessage: null };
  }
};
