'use server';

import { adminActionClient } from '@/lib/safe-action';
import prisma from '@/lib/prisma';

export const getWhatsAppStatus = adminActionClient.action(async () => {
  const session = await prisma.whatsappSession.findFirst();
  return {
    qr: session?.qrCode ?? null,
    status: session?.status ?? 'disconnected',
    phoneNumber: session?.phoneNumber ?? null,
  };
});

export const reconnectWhatsApp = adminActionClient.action(async () => {
  const { destroyWhatsAppSocket, initWhatsAppSocket } = await import('@/lib/whatsapp');
  await destroyWhatsAppSocket();
  await initWhatsAppSocket();
  return { success: true };
});

export const disconnectWhatsApp = adminActionClient.action(async () => {
  const { destroyWhatsAppSocket } = await import('@/lib/whatsapp');
  await destroyWhatsAppSocket();
  return { success: true };
});