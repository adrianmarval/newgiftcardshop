import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
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

export class SettingsService {
  async get<T>(key: SettingKey): Promise<T> {
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

  async set(key: SettingKey, value: unknown): Promise<void> {
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

  async getEscalationConfig(): Promise<EscalationConfig> {
    const [enabled, durationMinutes, dropAmount] = await Promise.all([
      this.get<boolean>(SETTING_KEYS.ESCALATION_ENABLED),
      this.get<number>(SETTING_KEYS.ESCALATION_DURATION_MINUTES),
      this.get<number>(SETTING_KEYS.ESCALATION_DROP_AMOUNT),
    ]);

    return { enabled, durationMinutes, dropAmount };
  }

  async setEscalationConfig(config: Partial<EscalationConfig>): Promise<void> {
    if (config.enabled !== undefined) {
      await this.set(SETTING_KEYS.ESCALATION_ENABLED, config.enabled);
    }
    if (config.durationMinutes !== undefined) {
      await this.set(SETTING_KEYS.ESCALATION_DURATION_MINUTES, config.durationMinutes);
    }
    if (config.dropAmount !== undefined) {
      await this.set(SETTING_KEYS.ESCALATION_DROP_AMOUNT, config.dropAmount);
    }
  }

  async getBinancePayId(): Promise<string> {
    return this.get<string>(SETTING_KEYS.BINANCE_PAY_ID);
  }

  async setBinancePayId(id: string): Promise<void> {
    await this.set(SETTING_KEYS.BINANCE_PAY_ID, id);
  }

  async getPlatformBalance(): Promise<Decimal> {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: SETTING_KEYS.PLATFORM_BALANCE },
      select: { balance: true },
    });
    return setting?.balance ?? new Decimal(0);
  }

  async updatePlatformBalance(amount: Decimal, type: 'add' | 'substract'): Promise<Decimal> {
    const result = await prisma.platformSettings.update({
      where: { key: SETTING_KEYS.PLATFORM_BALANCE },
      data: {
        balance: type === 'add' ? { increment: amount } : { decrement: amount },
      },
    });
    return result.balance;
  }

  async getAllSettings(): Promise<Record<SettingKey, { value: unknown; definition: typeof SETTING_DEFINITIONS[SettingKey] }>> {
    const settings = await prisma.platformSettings.findMany({
      select: { key: true, value: true, balance: true },
    });

    const result = {} as Record<SettingKey, { value: unknown; definition: typeof SETTING_DEFINITIONS[SettingKey] }>;

    for (const key of Object.keys(SETTING_KEYS) as SettingKey[]) {
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

  async getEditableSettings(): Promise<Record<SettingKey, { value: unknown; definition: typeof SETTING_DEFINITIONS[SettingKey] }>> {
    const all = await this.getAllSettings();
    const filtered = Object.fromEntries(
      Object.entries(all).filter(([, { definition }]) => definition.editable !== false)
    ) as Record<SettingKey, { value: unknown; definition: typeof SETTING_DEFINITIONS[SettingKey] }>;
    return filtered;
  }
}

export const settingsService = new SettingsService();