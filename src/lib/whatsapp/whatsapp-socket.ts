import { makeWASocket, fetchLatestBaileysVersion, DisconnectReason, WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import prisma from '@/lib/prisma';
import { useDbAuthState } from './auth-state-adapter';

const globalForWhatsApp = globalThis as unknown as {
  __whatsappSocket?: WASocket;
  __reconnectTimeout?: NodeJS.Timeout;
};

let whatsappSocket: WASocket | undefined = globalForWhatsApp.__whatsappSocket;

async function updateSessionStatus(updates: { status?: string; phoneNumber?: string | null; qrCode?: string | null }): Promise<void> {
  const existing = await prisma.whatsappSession.findFirst();
  if (existing) {
    await prisma.whatsappSession.update({ where: { id: existing.id }, data: updates });
  } else {
    await prisma.whatsappSession.create({
      data: {
        status: updates.status ?? 'disconnected',
        phoneNumber: updates.phoneNumber ?? null,
        qrCode: updates.qrCode ?? null,
      },
    });
  }
}

function clearReconnectTimeout(): void {
  if (globalForWhatsApp.__reconnectTimeout) {
    clearTimeout(globalForWhatsApp.__reconnectTimeout);
    globalForWhatsApp.__reconnectTimeout = undefined;
  }
}

function clearSocket(): void {
  whatsappSocket = undefined;
  globalForWhatsApp.__whatsappSocket = undefined;
}

export async function initWhatsAppSocket(): Promise<WASocket | undefined> {
  if (whatsappSocket) {
    console.log('[WhatsApp] Socket ya existe, reusando');
    return whatsappSocket;
  }

  clearReconnectTimeout();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useDbAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['GiftCardShop', 'Chrome', '1.0.0'],
    logger,
    generateHighQualityLinkPreview: true,
  });

  whatsappSocket = sock;
  globalForWhatsApp.__whatsappSocket = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('[WhatsApp] QR recibido — guardando en DB');
      await updateSessionStatus({ status: 'connecting', qrCode: qr });
    }

    if (connection === 'open') {
      const phoneNumber = sock.user?.id?.split(':')[0] ?? null;
      console.log('[WhatsApp] Conexión abierta ✓', phoneNumber ? `@${phoneNumber}` : '');
      await updateSessionStatus({ status: 'open', phoneNumber, qrCode: null });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      const reason = lastDisconnect?.error?.message;
      console.log('[WhatsApp] Conexión cerrada', { statusCode, reason });

      clearSocket();

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('[WhatsApp] loggedOut — limpiando auth state');
        await prisma.whatsappAuthState.deleteMany();
        await updateSessionStatus({ status: 'disconnected', phoneNumber: null, qrCode: null });
        return;
      }

      console.log('[WhatsApp] Reintentando en 5s...');
      await updateSessionStatus({ status: 'connecting' });

      globalForWhatsApp.__reconnectTimeout = setTimeout(() => {
        initWhatsAppSocket().catch((err) => {
          console.error('[WhatsApp] Error en reconexión:', err);
        });
      }, 5000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

export function getWhatsAppSocket(): WASocket | undefined {
  return whatsappSocket;
}

export function isWhatsAppConnected(): boolean {
  return !!whatsappSocket;
}

export async function destroyWhatsAppSocket(): Promise<void> {
  clearReconnectTimeout();

  if (whatsappSocket) {
    try {
      whatsappSocket.end(undefined);
    } catch {
      // ignored
    }
    clearSocket();
  }

  await prisma.whatsappAuthState.deleteMany();
  await updateSessionStatus({ status: 'disconnected', phoneNumber: null, qrCode: null });
}
