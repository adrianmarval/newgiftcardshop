'use server';

import { z } from 'zod';
import { connectDb } from '@/libs/mongodb';
import { addGiftcardFormSchema } from '@/validations';
import Giftcard from '@/models/Giftcard';
import { revalidatePath } from 'next/cache';

// Explicit Type for the giftcard Input
export const addGiftcard = async (giftcard: unknown) => {
  try {
    await connectDb();
    const result = addGiftcardFormSchema.parse(giftcard);
    const newGiftcard = new Giftcard(result);
    await newGiftcard.save();
    revalidatePath('/dashboard/sell/giftcards');
    return { error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((issue) => `${issue.path[0]}: ${issue.message}`).join(', ');
      return { error: errorMessage };
    } else if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
      return { error: 'Error: la tarjeta de regalo ya se encuentra registrada' };
    } else {
      console.error(error);
      return { error: 'Ocurrió un problema al agregar esta tarjeta de regalo' };
    }
  }
};
