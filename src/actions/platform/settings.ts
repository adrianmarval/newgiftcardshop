'use server';

import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import prisma from '@/lib/prisma';
import { adminActionClient, authActionClient } from '@/lib/safe-action';
import {
  deletePlatformSettingInputSchema,
  deletePlatformSettingOutputSchema,
  getPlatformSettingOutputSchema,
  setPlatformSettingInputSchema,
  setPlatformSettingOutputSchema,
} from '@/types/platform/settings';
import z from 'zod';

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

export const getBinancePayPaymentId = authActionClient.outputSchema(z.object({ binancePayId: z.string() })).action(async () => {
  const binancePayId = await prisma.platformSettings.findFirst({
    where: { key: 'binance_pay_id' },
    select: { value: true },
  });

  return {
    success: true as const,
    binancePayId: binancePayId?.value ?? '',
  };
});

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

export const deletePlatformSetting = adminActionClient
  .inputSchema(deletePlatformSettingInputSchema)
  .outputSchema(deletePlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key } }) => {
    await prisma.platformSettings.delete({
      where: { key },
    });
    return { success: true as const };
  });

export const updatePlatformBalance = authActionClient
  .inputSchema(z.object({ amount: z.instanceof(Decimal), type: z.enum(['add', 'substract']) }))
  .outputSchema(z.object({ success: z.boolean() }))
  .action(async ({ parsedInput: { amount, type } }) => {
    await prisma.platformSettings.update({
      where: { key: 'platformBalance' },
      data: { balance: type === 'add' ? { increment: amount } : { decrement: amount } },
    });
    return { success: true as const };
  });

export const getPlatformBalance = authActionClient.outputSchema(z.object({ balance: z.instanceof(Decimal) })).action(async () => {
  const platformBalance = await prisma.platformSettings.findFirst({
    where: { key: 'platformBalance' },
    select: { balance: true },
  });

  return {
    success: true as const,
    balance: platformBalance?.balance ?? new Decimal(0),
  };
});
