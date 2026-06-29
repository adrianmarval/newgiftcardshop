'use server';

import { adminActionClient, ActionError } from '@/lib/safe-action';
import prisma from '@/lib/prisma';
import { getWhatsAppStatusOutputSchema } from './schemas';

export const getWhatsAppStatus = adminActionClient.outputSchema(getWhatsAppStatusOutputSchema).action(async () => {
  try {
    const session = await prisma.whatsappSession.findFirst();
    return {
      success: true as const,
      qr: session?.qrCode ?? null,
      status: session?.status ?? 'disconnected',
      phoneNumber: session?.phoneNumber ?? null,
    };
  } catch (error) {
    console.error('[getWhatsAppStatus]', error);
    throw new ActionError('Error al obtener el estado de WhatsApp.');
  }
});