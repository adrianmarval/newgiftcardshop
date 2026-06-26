'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { z } from 'zod';

const disconnectWhatsAppOutputSchema = z.object({ success: z.literal(true) });

export const disconnectWhatsApp = adminActionClient.outputSchema(disconnectWhatsAppOutputSchema).action(async () => {
  try {
    const { destroyWhatsAppSocket } = await import('@/lib/whatsapp');
    await destroyWhatsAppSocket();
    return { success: true as const };
  } catch (error) {
    console.error('[disconnectWhatsApp]', error);
    throw new ActionError('Error al desconectar WhatsApp.');
  }
});
