'use server';

import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const reconnectWhatsAppOutputSchema = z.object({ success: z.literal(true) });

export const reconnectWhatsApp = adminActionClient.outputSchema(reconnectWhatsAppOutputSchema).action(async () => {
  const { destroyWhatsAppSocket, initWhatsAppSocket } = await import('@/lib/whatsapp');
  await destroyWhatsAppSocket();
  await initWhatsAppSocket();
  return { success: true as const };
});
