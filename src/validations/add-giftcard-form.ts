import { z } from 'zod';

export const addGiftcardFormSchema = z.object({
  id: z.string().optional(),
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
  status: z.enum(['paused', 'published', 'in escrow', 'sold', 'disputed']),
});
