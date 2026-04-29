/**
 * Utility for formatting currency amounts based on locale and currency.
 */

export type CurrencyLocale = 'en-US' | 'es-AR' | 'es-ES';

export function formatCurrency(
  amount: number | string,
  options: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const value = typeof amount === 'string' ? parseFloat(amount) : amount;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Formats a number as a simple currency string without the currency symbol if needed,
 * or with a specific symbol.
 */
export function formatAmount(
  amount: number | string,
  minimumFractionDigits = 2
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return value.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
}
