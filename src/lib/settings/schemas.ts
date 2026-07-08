import { z } from 'zod';

export const SETTING_KEYS = {
  PLATFORM_BALANCE: 'platformBalance',
  BINANCE_PAY_ID: 'binance_pay_id',
  ESCALATION_ENABLED: 'escalation_enabled',
  ESCALATION_DURATION_MINUTES: 'escalation_duration_minutes',
  ESCALATION_DROP_AMOUNT: 'escalation_drop_amount',
  AUTO_PAY_SELLERS: 'auto_pay_sellers',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const booleanSchema = z.enum(['true', 'false']).transform((val) => val === 'true');
const numberSchema = z.string().transform((val) => {
  const num = parseFloat(val);
  if (isNaN(num)) throw new Error(`Invalid number: ${val}`);
  return num;
});
const stringSchema = z.string();
const decimalSchema = z.string().transform((val) => {
  const num = parseFloat(val);
  if (isNaN(num)) throw new Error(`Invalid decimal: ${val}`);
  return num;
});

export type SettingType = 'boolean' | 'number' | 'string' | 'decimal';

export interface SettingDefinition<T = unknown> {
  key: SettingKey;
  type: SettingType;
  description: string;
  default: T;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
  editable?: boolean;
  auditOnly?: boolean;
}

export const SETTING_DEFINITIONS: Record<SettingKey, SettingDefinition> = {
  [SETTING_KEYS.PLATFORM_BALANCE]: {
    key: SETTING_KEYS.PLATFORM_BALANCE,
    type: 'decimal',
    description: 'Saldo disponible en la plataforma (auditoría)',
    default: 0,
    editable: false,
    auditOnly: true,
  },
  [SETTING_KEYS.BINANCE_PAY_ID]: {
    key: SETTING_KEYS.BINANCE_PAY_ID,
    type: 'string',
    description: 'ID de pago de Binance',
    default: '',
    validation: {
      pattern: /^\d+$/,
    },
  },
  [SETTING_KEYS.ESCALATION_ENABLED]: {
    key: SETTING_KEYS.ESCALATION_ENABLED,
    type: 'boolean',
    description: 'Habilitar sistema de reserva escalonada de tarjetas',
    default: true,
  },
  [SETTING_KEYS.ESCALATION_DURATION_MINUTES]: {
    key: SETTING_KEYS.ESCALATION_DURATION_MINUTES,
    type: 'number',
    description: 'Duración de cada tier de escalación en minutos',
    default: 5,
    validation: {
      min: 1,
      max: 60,
    },
  },
  [SETTING_KEYS.ESCALATION_DROP_AMOUNT]: {
    key: SETTING_KEYS.ESCALATION_DROP_AMOUNT,
    type: 'number',
    description: 'Cuánto baja el tier en cada ciclo de escalación',
    default: 1,
    validation: {
      min: 1,
      max: 10,
    },
  },
  [SETTING_KEYS.AUTO_PAY_SELLERS]: {
    key: SETTING_KEYS.AUTO_PAY_SELLERS,
    type: 'boolean',
    description: 'Pago automático a sellers vía Binance al confirmar lote (false = requiere aprobación manual)',
    default: false,
  },
};

export const SETTING_SCHEMAS: Record<SettingKey, z.ZodTypeAny> = {
  [SETTING_KEYS.PLATFORM_BALANCE]: decimalSchema,
  [SETTING_KEYS.BINANCE_PAY_ID]: stringSchema,
  [SETTING_KEYS.ESCALATION_ENABLED]: booleanSchema,
  [SETTING_KEYS.ESCALATION_DURATION_MINUTES]: numberSchema,
  [SETTING_KEYS.ESCALATION_DROP_AMOUNT]: numberSchema,
  [SETTING_KEYS.AUTO_PAY_SELLERS]: booleanSchema,
};

export function parseSettingValue<T>(key: SettingKey, rawValue: string | null | undefined): T {
  const definition = SETTING_DEFINITIONS[key];
  if (rawValue === null || rawValue === undefined) {
    return definition.default as T;
  }
  const schema = SETTING_SCHEMAS[key];
  const result = schema.safeParse(rawValue);
  if (!result.success) {
    console.warn(`Setting ${key} has invalid value "${rawValue}", using default: ${definition.default}`);
    return definition.default as T;
  }
  return result.data as T;
}

export function validateSettingValue(key: SettingKey, value: unknown): { valid: boolean; error?: string } {
  const definition = SETTING_DEFINITIONS[key];
  
  if (definition.type === 'boolean') {
    if (typeof value === 'boolean') return { valid: true };
    if (typeof value === 'string' && (value === 'true' || value === 'false')) return { valid: true };
    return { valid: false, error: 'Must be boolean' };
  }
  
  if (definition.type === 'number' || definition.type === 'decimal') {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return { valid: false, error: 'Must be a valid number' };
    if (definition.validation?.min !== undefined && num < definition.validation.min) {
      return { valid: false, error: `Must be >= ${definition.validation.min}` };
    }
    if (definition.validation?.max !== undefined && num > definition.validation.max) {
      return { valid: false, error: `Must be <= ${definition.validation.max}` };
    }
    return { valid: true };
  }
  
  if (definition.type === 'string') {
    if (definition.validation?.pattern && !definition.validation.pattern.test(String(value))) {
      return { valid: false, error: `Must match pattern ${definition.validation.pattern}` };
    }
    return { valid: true };
  }
  
  return { valid: false, error: 'Unknown setting type' };
}

export function serializeSettingValue(key: SettingKey, value: unknown): string {
  const definition = SETTING_DEFINITIONS[key];
  if (definition.type === 'boolean') {
    return String(Boolean(value));
  }
  return String(value);
}