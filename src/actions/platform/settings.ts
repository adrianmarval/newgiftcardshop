'use server';

import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import prisma from '@/lib/prisma';
import { ActionError, adminActionClient, authActionClient } from '@/lib/safe-action';
import { SETTING_KEYS, SETTING_DEFINITIONS, validateSettingValue, serializeSettingValue, type SettingKey } from '@/lib/settings/schemas';
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
      balance: s.balance?.toNumber() ?? undefined,
    })),
  };
});

const getBinancePayPaymentIdOutputSchema = z.object({ binancePayId: z.string() });

export const getBinancePayPaymentId = authActionClient.outputSchema(getBinancePayPaymentIdOutputSchema).action(async () => {
  const binancePayId = await prisma.platformSettings.findFirst({
    where: { key: SETTING_KEYS.BINANCE_PAY_ID },
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
});

const setPlatformSettingOutputSchema = z.object({ success: z.boolean() });

export const setPlatformSetting = adminActionClient
  .inputSchema(setPlatformSettingInputSchema)
  .outputSchema(setPlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key, value, description } }) => {
    const settingKey = key as SettingKey;
    const definition = SETTING_DEFINITIONS[settingKey];

    if (!definition) {
      throw new ActionError(`Setting "${key}" is not a defined configuration`);
    }

    if (definition.auditOnly) {
      throw new ActionError(`Setting "${key}" is audit-only and cannot be edited`);
    }

    const validation = validateSettingValue(settingKey, value);
    if (!validation.valid) {
      throw new ActionError(`Invalid value for ${key}: ${validation.error}`);
    }

    const serialized = serializeSettingValue(settingKey, value);

    await prisma.platformSettings.upsert({
      where: { key },
      update: { value: serialized, description: description ?? definition.description },
      create: { key, value: serialized, description: description ?? definition.description },
    });

    return { success: true as const };
  });

const deletePlatformSettingInputSchema = z.object({ key: z.string() });

const deletePlatformSettingOutputSchema = z.object({ success: z.boolean() });

export const deletePlatformSetting = adminActionClient
  .inputSchema(deletePlatformSettingInputSchema)
  .outputSchema(deletePlatformSettingOutputSchema)
  .action(async ({ parsedInput: { key } }) => {
    const settingKey = key as SettingKey;
    const definition = SETTING_DEFINITIONS[settingKey];

    if (!definition) {
      throw new ActionError(`Setting "${key}" is not a defined configuration`);
    }

    if (definition.auditOnly) {
      throw new ActionError(`Setting "${key}" is audit-only and cannot be deleted`);
    }

    await prisma.platformSettings.delete({
      where: { key },
    });
    return { success: true as const };
  });

const updatePlatformBalanceInputSchema = z.object({ amount: z.instanceof(Decimal), type: z.enum(['add', 'substract']) });

const updatePlatformBalanceOutputSchema = z.object({ success: z.boolean() });

export const updatePlatformBalance = adminActionClient
  .inputSchema(updatePlatformBalanceInputSchema)
  .outputSchema(updatePlatformBalanceOutputSchema)
  .action(async ({ parsedInput: { amount, type } }) => {
    await prisma.platformSettings.update({
      where: { key: SETTING_KEYS.PLATFORM_BALANCE },
      data: { balance: type === 'add' ? { increment: amount } : { decrement: amount } },
    });
    return { success: true as const };
  });

const getPlatformBalanceOutputSchema = z.object({ balance: z.instanceof(Decimal) });
export const getPlatformBalance = adminActionClient.outputSchema(getPlatformBalanceOutputSchema).action(async () => {
  const platformBalance = await prisma.platformSettings.findFirst({
    where: { key: SETTING_KEYS.PLATFORM_BALANCE },
    select: { balance: true },
  });

  return {
    success: true as const,
    balance: platformBalance?.balance ?? new Decimal(0),
  };
});