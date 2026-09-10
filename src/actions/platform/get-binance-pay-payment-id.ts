'use server';

import { authActionClient } from '@/lib/safe-action';
import { getBinancePayId } from '@/lib/settings/settings.service';
import { getBinancePayPaymentIdOutputSchema } from './schemas';

export const getBinancePayPaymentId = authActionClient
  .outputSchema(getBinancePayPaymentIdOutputSchema)
  .action(async () => {
    return {
      success: true as const,
      binancePayId: await getBinancePayId(),
    };
  });
