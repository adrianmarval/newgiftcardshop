'use server';

import prisma from '@/lib/prisma';
import { authActionClient } from '@/lib/safe-action';
import { SETTING_KEYS } from '@/lib/settings';
import { getBinancePayPaymentIdOutputSchema } from './schemas';

export const getBinancePayPaymentId = authActionClient
  .outputSchema(getBinancePayPaymentIdOutputSchema)
  .action(async () => {
    const binancePayId = await prisma.platformSettings.findFirst({
      where: { key: SETTING_KEYS.BINANCE_PAY_ID },
      select: { value: true },
    });

    return {
      success: true as const,
      binancePayId: binancePayId?.value ?? '',
    };
  });