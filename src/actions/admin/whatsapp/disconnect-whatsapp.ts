'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import { disconnectWhatsAppOutputSchema } from './schemas';

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