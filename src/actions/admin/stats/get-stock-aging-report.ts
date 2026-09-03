'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { getStockAgingReport as getStockAgingReportService } from '@/lib/services/stats';
import { getStockAgingReportOutputSchema } from './schemas';

export const getStockAgingReport = adminActionClient.outputSchema(getStockAgingReportOutputSchema).action(async () => {
  try {
    return await getStockAgingReportService();
  } catch (error) {
    console.error('[getStockAgingReport]', error);
    throw new ActionError('Error al obtener el reporte de antigüedad de stock.');
  }
});
