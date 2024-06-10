import { z } from 'zod';

export const addGiftcardFormSchema = z.object({
  _id: z.string(),
  brand: z.enum(['amazon', 'apple', 'wallmart']),
  country: z.enum(['us', 'uk', 'ca']),
  origin: z.enum(['surveys', 'offers', 'studies']),
  amount: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val), {
      message: 'El monto debe ser un número',
    })
    .transform((val) => val.toString()),
  claimCode: z.string().min(1, 'El código de canje es requerido'),
});
