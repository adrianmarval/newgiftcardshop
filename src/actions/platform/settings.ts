'use server';

import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import prisma from '@/lib/prisma';
import { adminActionClient, authActionClient } from '@/lib/safe-action';
import z from 'zod';

const platformSettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable().optional(),
  balance: z.number().optional(),
});
export type PlatformSetting = z.infer<typeof platformSettingSchema>;

const getPlatformSettingOutputSchema = z.object({
  success: z.boolean(),
  settings: platformSettingSchema.array(),
});

export const getPlatformSetting = adminActionClient.outputSchema(getPlatformSettingOutputSchema).action(async () => {
  const settings = await prisma.platformSettings.findMany();

  return {
    success: true as const,
    settings: settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      description: s.description ?? null,
      balance: s.balance.toNumber(),
    })),
  };
});

const getBinancePayPaymentIdOutputSchema = z.object({ binancePayId: z.string() });

export const getBinancePayPaymentId = authActionClient.outputSchema(getBinancePayPaymentIdOutputSchema).action(async () => {
  const binancePayId = await prisma.platformSettings.findFirst({
    where: { key: 'binance_pay_id' },
    select: { value: true },
  });

  return {
    success: true as const,
    binancePayId: binancePayId?.value ?? '',
  };
});

const setPlatformSettingInputSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
  balance: z.number().optional(),
});

const setPlatformSettingOutputSchema = z.object({ success: z.boolean() });

export const setPlatformSetting = adminActionClient
  .inputSchema(setPlatformSettingInputSchema)
  .outputSchema(setPlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key, value, description, balance } }) => {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value, description, ...(balance !== undefined && { balance }) },
      create: { key, value, description, ...(balance !== undefined && { balance }) },
    });
    return { success: true as const };
  });

const deletePlatformSettingInputSchema = z.object({ key: z.string() });

const deletePlatformSettingOutputSchema = z.object({ success: z.boolean() });

export const deletePlatformSetting = adminActionClient
  .inputSchema(deletePlatformSettingInputSchema)
  .outputSchema(deletePlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key } }) => {
    await prisma.platformSettings.delete({
      where: { key },
    });
    return { success: true as const };
  });

const updatePlatformBalanceInputSchema = z.object({ amount: z.instanceof(Decimal), type: z.enum(['add', 'substract']) });

const updatePlatformBalanceOutputSchema = z.object({ success: z.boolean() });

export const updatePlatformBalance = authActionClient
  .inputSchema(updatePlatformBalanceInputSchema)
  .outputSchema(updatePlatformBalanceOutputSchema)
  .action(async ({ parsedInput: { amount, type } }) => {
    await prisma.platformSettings.update({
      where: { key: 'platformBalance' },
      data: { balance: type === 'add' ? { increment: amount } : { decrement: amount } },
    });
    return { success: true as const };
  });

const getPlatformBalanceOutputSchema = z.object({ balance: z.instanceof(Decimal) });
export const getPlatformBalance = authActionClient.outputSchema(getPlatformBalanceOutputSchema).action(async () => {
  const platformBalance = await prisma.platformSettings.findFirst({
    where: { key: 'platformBalance' },
    select: { balance: true },
  });

  return {
    success: true as const,
    balance: platformBalance?.balance ?? new Decimal(0),
  };
});
