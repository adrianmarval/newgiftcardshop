'use server';

import { ActionError, adminActionClient } from '@/lib/safe-action';
import binance from '@/lib/services/payment/binance.service';
import { executeAdminWithdrawal, WithdrawalError } from '@/lib/services/payment/admin-withdrawal.service';
import { Decimal } from '@prisma/client/runtime/client';
import { withdrawBalanceInputSchema, withdrawBalanceOutputSchema } from './schemas';

export const withdrawBalance = adminActionClient
  .inputSchema(withdrawBalanceInputSchema)
  .outputSchema(withdrawBalanceOutputSchema)
  .action(async ({ parsedInput }) => {
    const amount = new Decimal(parsedInput.amount).toDecimalPlaces(2);

    // Early friendly check against the real Funding wallet — the authoritative
    // platformBalance guard runs inside executeAdminWithdrawal's transaction
    let fundingBalance: Decimal;
    try {
      fundingBalance = new Decimal(await binance.getFundingUsdtBalance());
    } catch {
      throw new ActionError('No se pudo consultar el balance de Binance. Intenta de nuevo en unos segundos.');
    }

    if (fundingBalance.lt(amount)) {
      throw new ActionError(
        `Balance Funding de Binance insuficiente (disponible: $${fundingBalance.toFixed(2)}, requerido: $${amount.toFixed(2)}).`,
      );
    }

    try {
      const result = await executeAdminWithdrawal({
        amount,
        notes: parsedInput.notes,
      });

      if (result.status === 'FAILED') {
        throw new ActionError(result.error ?? 'El retiro fue rechazado por Binance.');
      }

      return result;
    } catch (error) {
      if (error instanceof ActionError) throw error;
      if (error instanceof WithdrawalError) throw new ActionError(error.message);
      throw new ActionError('Error inesperado al procesar el retiro.');
    }
  });
