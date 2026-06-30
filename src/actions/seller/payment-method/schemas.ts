import { z } from 'zod';

export const paymentMethodOutputSchema = z.object({
  id: z.string(),
  coinId: z.string(),
  networkId: z.string(),
  address: z.string(),
  isBinanceWallet: z.boolean(),
  updatedAt: z.date(),
  coin: z.object({
    id: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
  }),
  network: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    regex: z.string(),
  }),
});

export const getPaymentMethodOutputSchema = z.object({
  success: z.literal(true),
  paymentMethod: paymentMethodOutputSchema.nullable(),
});

export const upsertPaymentMethodInputSchema = z.object({
  coinId: z.string().min(1, 'Coin is required'),
  networkId: z.string().min(1, 'Network is required'),
  address: z.string().trim().min(1, 'Address is required'),
  isBinanceWallet: z.boolean().default(false),
});

export const upsertPaymentMethodOutputSchema = z.object({
  success: z.literal(true),
  paymentMethod: paymentMethodOutputSchema,
});

export const deletePaymentMethodOutputSchema = z.object({
  success: z.literal(true),
});
