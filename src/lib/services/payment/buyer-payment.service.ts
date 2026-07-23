// ─────────────────────────────────────────────────────────────────────────────
// Buyer Payment Service — Validate buyer TxID via Binance Pay API
//
// Flow:
//   1. Local validation: regex format + duplicate TxID check
//   2. Binance API: getPayTradeHistory() match by orderId
//   3. Validate currency + amount (tolerance 0.01)
//   4. Return ValidationResult with code
//
// Prevents double payment via:
//   - binanceTxId duplicate check (Payment table)
//   - Order status guard (AWAITING_PAYMENT only)
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';
import binance from '@/lib/services/payment/binance.service';
import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────────────────────

export type VerificationCode =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'API_ERROR'
  | 'DUPLICATE'
  | 'INVALID_FORMAT';

export interface ValidationResult {
  isValid: boolean;
  message: string;
  code: VerificationCode;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EXPECTED_CURRENCY = process.env.PAYMENT_CURRENCY || 'USDT';
const AMOUNT_TOLERANCE = 0.01;
const TXID_REGEX = /^\d{18,}$/;
const LOOKBACK_DAYS = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatToUSDT(amount: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(amount)} USDT`;
}

function getStartTime(): number {
  const now = new Date();
  now.setDate(now.getDate() - LOOKBACK_DAYS);
  return now.getTime();
}

// ── Main Validation ──────────────────────────────────────────────────────────

/**
 * Validates a buyer's Binance Pay transaction ID.
 *
 * Step 1: Local validation (regex + duplicate check)
 * Step 2: Binance API verification (currency + amount match)
 */
export async function validateBuyerPayment(txId: string, expectedAmount: string, excludeOrderId?: string): Promise<ValidationResult> {
  // ── Step 1a: Format validation ───────────────────────────────────────────
  if (!TXID_REGEX.test(txId)) {
    logger.warn('Invalid Binance TxID format', {
      flow: 'payment',
      action: 'validate-buyer-payment',
      metadata: { txId: txId.substring(0, 6) + '...' },
    });
    return {
      isValid: false,
      message: 'El formato del ID de transacción es inválido. Debe ser un número de 18+ dígitos.',
      code: 'INVALID_FORMAT',
    };
  }

  // ── Step 1b: Duplicate check ─────────────────────────────────────────────
  const existingPayment = await prisma.payment.findFirst({
    where: {
      binanceTxId: txId,
      ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
    },
    select: { id: true, orderId: true },
  });

  if (existingPayment) {
    logger.warn('Duplicate Binance TxID detected', {
      flow: 'payment',
      action: 'validate-buyer-payment',
      metadata: { txId: txId.substring(0, 6) + '...', existingOrderId: existingPayment.orderId },
    });
    return {
      isValid: false,
      message: `Este ID de transacción ya fue utilizado en otra orden.`,
      code: 'DUPLICATE',
    };
  }

  // ── Step 2: Binance API verification ─────────────────────────────────────
  try {
    const tradeHistory = await binance.getPayTradeHistory({
      startTime: getStartTime(),
    });

    if (!tradeHistory || !tradeHistory.data) {
      logger.error('Binance Pay API returned no data', {
        flow: 'payment',
        action: 'validate-buyer-payment',
        metadata: { txId: txId.substring(0, 6) + '...' },
      });
      return {
        isValid: false,
        message: 'No se pudo conectar con Binance. Reintentá en unos segundos.',
        code: 'API_ERROR',
      };
    }

    const record = tradeHistory.data.find((r) => r.orderId === txId);

    if (!record) {
      logger.warn('TxID not found in Binance Pay history', {
        flow: 'payment',
        action: 'validate-buyer-payment',
        metadata: { txId: txId.substring(0, 6) + '...' },
      });
      return {
        isValid: false,
        message: 'El ID de transacción no fue encontrado en Binance. Verificá el ID y reintenta.',
        code: 'NOT_FOUND',
      };
    }

    // Validate currency
    if (record.currency !== EXPECTED_CURRENCY) {
      logger.warn('Currency mismatch in Binance Pay validation', {
        flow: 'payment',
        action: 'validate-buyer-payment',
        metadata: {
          txId: txId.substring(0, 6) + '...',
          expected: EXPECTED_CURRENCY,
          actual: record.currency,
        },
      });
      return {
        isValid: false,
        message: `La moneda del pago no coincide. Se esperaba ${EXPECTED_CURRENCY}, se recibió ${record.currency}.`,
        code: 'CURRENCY_MISMATCH',
      };
    }

    // Validate amount with tolerance
    const expected = parseFloat(expectedAmount);
    const actual = parseFloat(record.amount);
    const amountsMatch = Math.abs(expected - actual) < AMOUNT_TOLERANCE;

    if (!amountsMatch) {
      logger.warn('Amount mismatch in Binance Pay validation', {
        flow: 'payment',
        action: 'validate-buyer-payment',
        metadata: {
          txId: txId.substring(0, 6) + '...',
          expected,
          actual,
        },
      });
      return {
        isValid: false,
        message: `El monto no coincide.\nMonto de la orden: ${formatToUSDT(expected)}\nMonto del pago: ${formatToUSDT(actual)}`,
        code: 'AMOUNT_MISMATCH',
      };
    }

    // All checks passed
    logger.info('Binance Pay validation successful', {
      flow: 'payment',
      action: 'validate-buyer-payment',
      metadata: {
        txId: txId.substring(0, 6) + '...',
        amount: actual,
        currency: record.currency,
      },
    });

    return {
      isValid: true,
      message: 'Pago verificado exitosamente.',
      code: 'SUCCESS',
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error during Binance Pay API call', {
      flow: 'payment',
      action: 'validate-buyer-payment',
      metadata: { txId: txId.substring(0, 6) + '...' },
      error: { name: 'BinancePayApiError', message: errMsg },
    });
    return {
      isValid: false,
      message: 'Error de conexión con Binance. Reintentá en unos segundos.',
      code: 'API_ERROR',
    };
  }
}
