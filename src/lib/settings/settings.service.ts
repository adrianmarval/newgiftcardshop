import { Decimal } from '@prisma/client/runtime/client';
import prisma from '@/lib/prisma';
import {
  SETTING_KEYS,
  SETTING_DEFINITIONS,
  type SettingKey,
  parseSettingValue,
  validateSettingValue,
  serializeSettingValue,
} from './schemas';
import type { EscalationConfig } from '@/types';

export async function getSetting<T>(key: SettingKey): Promise<T> {
  const setting = await prisma.platformSettings.findUnique({
    where: { key },
    select: { key: true, value: true, balance: true },
  });

  if (!setting && key === SETTING_KEYS.PLATFORM_BALANCE) {
    return parseSettingValue<T>(key, null);
  }

  if (!setting) {
    return SETTING_DEFINITIONS[key].default as T;
  }

  if (key === SETTING_KEYS.PLATFORM_BALANCE && setting.balance !== null) {
    return setting.balance.toNumber() as T;
  }

  return parseSettingValue<T>(key, setting.value);
}

export async function setSetting(key: SettingKey, value: unknown): Promise<void> {
  const validation = validateSettingValue(key, value);
  if (!validation.valid) {
    throw new Error(`Invalid value for setting ${key}: ${validation.error}`);
  }

  const serialized = serializeSettingValue(key, value);

  await prisma.platformSettings.upsert({
    where: { key },
    update: { value: serialized },
    create: { key, value: serialized, description: SETTING_DEFINITIONS[key].description },
  });
}

export async function getEscalationConfig(): Promise<EscalationConfig> {
  const [enabled, durationMinutes, dropAmount] = await Promise.all([
    getSetting<boolean>(SETTING_KEYS.ESCALATION_ENABLED),
    getSetting<number>(SETTING_KEYS.ESCALATION_DURATION_MINUTES),
    getSetting<number>(SETTING_KEYS.ESCALATION_DROP_AMOUNT),
  ]);

  return { enabled, durationMinutes, dropAmount };
}

export async function setEscalationConfig(config: Partial<EscalationConfig>): Promise<void> {
  if (config.enabled !== undefined) {
    await setSetting(SETTING_KEYS.ESCALATION_ENABLED, config.enabled);
  }
  if (config.durationMinutes !== undefined) {
    await setSetting(SETTING_KEYS.ESCALATION_DURATION_MINUTES, config.durationMinutes);
  }
  if (config.dropAmount !== undefined) {
    await setSetting(SETTING_KEYS.ESCALATION_DROP_AMOUNT, config.dropAmount);
  }
}

export async function getBinancePayId(): Promise<string> {
  return getSetting<string>(SETTING_KEYS.BINANCE_PAY_ID);
}

export async function setBinancePayId(id: string): Promise<void> {
  await setSetting(SETTING_KEYS.BINANCE_PAY_ID, id);
}

export async function getPlatformBalance(): Promise<Decimal> {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: SETTING_KEYS.PLATFORM_BALANCE },
    select: { balance: true },
  });
  return setting?.balance ?? new Decimal(0);
}

export async function updatePlatformBalance(amount: Decimal, type: 'add' | 'subtract'): Promise<Decimal> {
  const result = await prisma.platformSettings.update({
    where: { key: SETTING_KEYS.PLATFORM_BALANCE },
    data: {
      balance: type === 'add' ? { increment: amount } : { decrement: amount },
    },
  });
  return result.balance;
}

export async function getAllSettings(): Promise<Record<SettingKey, { value: unknown; definition: typeof SETTING_DEFINITIONS[SettingKey] }>> {
  const settings = await prisma.platformSettings.findMany({
    select: { key: true, value: true, balance: true },
  });

  const result = {} as Record<SettingKey, { value: unknown; definition: typeof SETTING_DEFINITIONS[SettingKey] }>;

  for (const key of Object.values(SETTING_KEYS)) {
    const setting = settings.find((s) => s.key === key);
    const definition = SETTING_DEFINITIONS[key];

    if (key === SETTING_KEYS.PLATFORM_BALANCE) {
      result[key] = {
        value: setting?.balance?.toNumber() ?? definition.default,
        definition,
      };
    } else {
      result[key] = {
        value: parseSettingValue(key, setting?.value),
        definition,
      };
    }
  }

  return result;
}

export async function getAutoPaySellers(): Promise<boolean> {
  return getSetting<boolean>(SETTING_KEYS.AUTO_PAY_SELLERS);
}

export async function setAutoPaySellers(enabled: boolean): Promise<void> {
  await setSetting(SETTING_KEYS.AUTO_PAY_SELLERS, enabled);
}

export async function getStockDigestIntervalMinutes(): Promise<number> {
  return getSetting<number>(SETTING_KEYS.STOCK_DIGEST_INTERVAL_MINUTES);
}
