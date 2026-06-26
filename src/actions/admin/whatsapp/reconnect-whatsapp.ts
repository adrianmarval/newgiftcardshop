'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { z } from 'zod';

const reconnectWhatsAppOutputSchema = z.object({ success: z.literal(true) });

export const reconnectWhatsApp = adminActionClient.outputSchema(reconnectWhatsAppOutputSchema).action(async () => {
  try {
    const { destroyWhatsAppSocket, initWhatsAppSocket } = await import('@/lib/whatsapp');
    await destroyWhatsAppSocket();
    await initWhatsAppSocket();
    return { success: true as const };
  } catch (error) {
    console.error('[reconnectWhatsApp]', error);
    throw new ActionError('Error al reconectar WhatsApp.');
  }
});
