'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { executeSellerPayout } from '@/lib/services/payment/seller-payout.service';
import { logger } from '@/lib/logger';
import { payBatchInputSchema, payBatchOutputSchema } from './schemas';

export const payBatch = adminActionClient
  .inputSchema(payBatchInputSchema)
  .outputSchema(payBatchOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { batchIds } = parsedInput;

      const results: { batchId: number; paymentId: string; amount: number }[] = [];
      const errors: { batchId: number; error: string }[] = [];

      for (const batchId of batchIds) {
        const result = await executeSellerPayout(batchId);

        if (result.status === 'FAILED') {
          errors.push({ batchId, error: result.error || 'Error desconocido' });
          continue;
        }

        results.push({
          batchId: result.batchId,
          paymentId: result.paymentId,
          amount: result.amount,
        });
      }

      if (results.length === 0 && errors.length > 0) {
        throw new ActionError(
          `Ningún lote pudo ser pagado. Errores: ${errors.map((e) => `#${e.batchId}: ${e.error}`).join('; ')}`,
        );
      }

      return {
        success: true as const,
        results,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      if (error instanceof ActionError) throw error;

      logger.error('Error al pagar lotes', {
        flow: 'payment',
        action: 'pay-batch',
        error: {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : 'Unknown',
        },
      });
      throw new ActionError('Error al procesar el pago de lotes.');
    }
  });
