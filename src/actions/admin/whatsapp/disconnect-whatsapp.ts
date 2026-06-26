'use server';

import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const disconnectWhatsAppOutputSchema = z.object({ success: z.literal(true) });

export const disconnectWhatsApp = adminActionClient.outputSchema(disconnectWhatsAppOutputSchema).action(async () => {
  const { destroyWhatsAppSocket } = await import('@/lib/whatsapp');
  await destroyWhatsAppSocket();
  return { success: true as const };
});
