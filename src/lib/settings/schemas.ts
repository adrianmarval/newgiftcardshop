import { z } from 'zod';

export const SETTING_KEYS = {
  PLATFORM_BALANCE: 'platformBalance',
  BINANCE_PAY_ID: 'binance_pay_id',
  ESCALATION_ENABLED: 'escalation_enabled',
  ESCALATION_DURATION_MINUTES: 'escalation_duration_minutes',
  ESCALATION_DROP_AMOUNT: 'escalation_drop_amount',
  AUTO_PAY_SELLERS: 'auto_pay_sellers',
  STOCK_REMINDER_INTERVAL_MINUTES: 'stock_reminder_interval_minutes',
  PAYMENT_REMINDER_INTERVAL_MINUTES: 'payment_reminder_interval_minutes',
  PENDING_ORDER_ALERT_MINUTES: 'pending_order_alert_minutes',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// ─────────────────────────────────────────────────────────────────────────────
// Setting Groups — UI sections for the admin settings page
// ─────────────────────────────────────────────────────────────────────────────

export const SETTING_GROUPS = {
  payments: {
    title: 'Pagos',
    description: 'Binance Pay y cobros a sellers.',
  },
  escalation: {
    title: 'Escalación de inventario',
    description: 'Controla cómo baja el tier de las tarjetas inactivas con el tiempo.',
  },
  platform: {
    title: 'Plataforma',
    description: 'Estado operativo de la plataforma. Solo lectura.',
  },
  notifications: {
    title: 'Notificaciones',
    description: 'Recordatorios de stock varado para Telegram/Push. Cada brand-country puede tener su propio intervalo.',
  },
  adminAlerts: {
    title: 'Alertas del admin',
    description: 'Avisos al admin cuando algo requiere atención.',
  },
} as const;

export type SettingGroupId = keyof typeof SETTING_GROUPS;

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

/** Control que la UI debe renderizar para este setting */
export type SettingInput = 'switch' | 'number' | 'text';

export interface SettingDefinition<T = unknown> {
  key: SettingKey;
  type: SettingType;
  group: SettingGroupId;
  /** Nombre corto mostrado en la UI */
  label: string;
  /** Texto de ayuda mostrado bajo el campo */
  description: string;
  default: T;
  input: SettingInput;
  /** Unidad mostrada junto al input (ej. "min") */
  unit?: string;
  /** Step para inputs numéricos */
  step?: number;
  /** Si es true, la UI pide confirmación de peligro antes de guardar */
  dangerous?: boolean;
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
    group: 'platform',
    label: 'Balance de plataforma',
    description: 'Saldo disponible. Se modifica automáticamente con depósitos, reembolsos y pagos a sellers.',
    default: 0,
    input: 'number',
    editable: false,
    auditOnly: true,
  },
  [SETTING_KEYS.BINANCE_PAY_ID]: {
    key: SETTING_KEYS.BINANCE_PAY_ID,
    type: 'string',
    group: 'payments',
    label: 'Binance Pay ID',
    description: 'ID de Binance Pay donde los buyers envían sus pagos.',
    default: '',
    input: 'text',
    validation: {
      pattern: /^\d+$/,
    },
  },
  [SETTING_KEYS.AUTO_PAY_SELLERS]: {
    key: SETTING_KEYS.AUTO_PAY_SELLERS,
    type: 'boolean',
    group: 'payments',
    label: 'Pago automático a sellers',
    description: 'Paga automáticamente vía Binance los lotes confirmados. Desactivado = aprobación manual.',
    default: false,
    input: 'switch',
    dangerous: true,
  },
  [SETTING_KEYS.ESCALATION_ENABLED]: {
    key: SETTING_KEYS.ESCALATION_ENABLED,
    type: 'boolean',
    group: 'escalation',
    label: 'Escalación habilitada',
    description: 'Baja automáticamente el tier de las tarjetas que llevan tiempo sin venderse.',
    default: true,
    input: 'switch',
  },
  [SETTING_KEYS.ESCALATION_DURATION_MINUTES]: {
    key: SETTING_KEYS.ESCALATION_DURATION_MINUTES,
    type: 'number',
    group: 'escalation',
    label: 'Duración por tier',
    description: 'Minutos que permanece una tarjeta en cada tier antes de bajar.',
    default: 5,
    input: 'number',
    unit: 'min',
    step: 1,
    validation: {
      min: 1,
      max: 60,
    },
  },
  [SETTING_KEYS.ESCALATION_DROP_AMOUNT]: {
    key: SETTING_KEYS.ESCALATION_DROP_AMOUNT,
    type: 'number',
    group: 'escalation',
    label: 'Niveles por ciclo',
    description: 'Cuántos niveles baja el tier en cada ciclo de escalación.',
    default: 1,
    input: 'number',
    step: 1,
    validation: {
      min: 1,
      max: 10,
    },
  },
  [SETTING_KEYS.STOCK_REMINDER_INTERVAL_MINUTES]: {
    key: SETTING_KEYS.STOCK_REMINDER_INTERVAL_MINUTES,
    type: 'number',
    group: 'notifications',
    label: 'Intervalo del recordatorio de stock',
    description: 'Si todo el stock accesible de un buyer lleva más de X min sin rotar, recibe UN recordatorio (máx 1 cada X min por marca). Default para brand-countries sin intervalo propio.',
    default: 60,
    input: 'number',
    unit: 'min',
    step: 5,
    validation: {
      min: 15,
      max: 1440,
    },
  },
  [SETTING_KEYS.PAYMENT_REMINDER_INTERVAL_MINUTES]: {
    key: SETTING_KEYS.PAYMENT_REMINDER_INTERVAL_MINUTES,
    type: 'number',
    group: 'notifications',
    label: 'Intervalo del recordatorio de pago',
    description: 'Un buyer con una orden PENDING o AWAITING_PAYMENT recibe un recordatorio cada X min hasta que pague o cancele.',
    default: 60,
    input: 'number',
    unit: 'min',
    step: 5,
    validation: {
      min: 15,
      max: 1440,
    },
  },
  [SETTING_KEYS.PENDING_ORDER_ALERT_MINUTES]: {
    key: SETTING_KEYS.PENDING_ORDER_ALERT_MINUTES,
    type: 'number',
    group: 'adminAlerts',
    label: 'Alerta de orden sin confirmar',
    description: 'Si una orden lleva más de X min en PENDING (códigos entregados, sin confirmar uso), el admin recibe UNA alerta por orden.',
    default: 60,
    input: 'number',
    unit: 'min',
    step: 5,
    validation: {
      min: 15,
      max: 1440,
    },
  },
};

/** Definiciones de un grupo, en el orden declarado en el registry */
export function getSettingsByGroup(group: SettingGroupId): SettingDefinition[] {
  return Object.values(SETTING_DEFINITIONS).filter((d) => d.group === group);
}

/** Keys editables de un grupo (excluye auditOnly y editable: false) */
export function getEditableKeysByGroup(group: SettingGroupId): SettingKey[] {
  return getSettingsByGroup(group)
    .filter((d) => !d.auditOnly && d.editable !== false)
    .map((d) => d.key);
}

export const SETTING_SCHEMAS: Record<SettingKey, z.ZodTypeAny> = {
  [SETTING_KEYS.PLATFORM_BALANCE]: decimalSchema,
  [SETTING_KEYS.BINANCE_PAY_ID]: stringSchema,
  [SETTING_KEYS.ESCALATION_ENABLED]: booleanSchema,
  [SETTING_KEYS.ESCALATION_DURATION_MINUTES]: numberSchema,
  [SETTING_KEYS.ESCALATION_DROP_AMOUNT]: numberSchema,
  [SETTING_KEYS.AUTO_PAY_SELLERS]: booleanSchema,
  [SETTING_KEYS.STOCK_REMINDER_INTERVAL_MINUTES]: numberSchema,
  [SETTING_KEYS.PAYMENT_REMINDER_INTERVAL_MINUTES]: numberSchema,
  [SETTING_KEYS.PENDING_ORDER_ALERT_MINUTES]: numberSchema,
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
    return { valid: false, error: 'Debe ser booleano' };
  }

  if (definition.type === 'number' || definition.type === 'decimal') {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return { valid: false, error: 'Debe ser un número válido' };
    if (definition.validation?.min !== undefined && num < definition.validation.min) {
      return { valid: false, error: `Debe ser >= ${definition.validation.min}` };
    }
    if (definition.validation?.max !== undefined && num > definition.validation.max) {
      return { valid: false, error: `Debe ser <= ${definition.validation.max}` };
    }
    return { valid: true };
  }

  if (definition.type === 'string') {
    if (definition.validation?.pattern && !definition.validation.pattern.test(String(value))) {
      return { valid: false, error: 'No cumple con el formato esperado' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Tipo de setting desconocido' };
}

export function serializeSettingValue(key: SettingKey, value: unknown): string {
  const definition = SETTING_DEFINITIONS[key];
  if (definition.type === 'boolean') {
    return String(Boolean(value));
  }
  return String(value);
}
