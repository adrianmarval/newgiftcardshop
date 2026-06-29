import { makeWASocket, fetchLatestBaileysVersion, DisconnectReason, WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import prisma from '@/lib/prisma';
import { useDbAuthState } from './auth-state-adapter';
import { logger } from '@/lib/logger';

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
    logger.info('[WhatsApp] Socket ya existe, reusando');
    return whatsappSocket;
  }

  clearReconnectTimeout();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useDbAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const pinoLogger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ['GiftCardShop', 'Chrome', '1.0.0'],
    logger: pinoLogger,
    generateHighQualityLinkPreview: true,
  });

  whatsappSocket = sock;
  globalForWhatsApp.__whatsappSocket = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('[WhatsApp] QR recibido — guardando en DB');
      await updateSessionStatus({ status: 'connecting', qrCode: qr });
    }

    if (connection === 'open') {
      const phoneNumber = sock.user?.id?.split(':')[0] ?? null;
      logger.info('[WhatsApp] Conexión abierta ✓', { metadata: { phoneNumber } });
      await updateSessionStatus({ status: 'open', phoneNumber, qrCode: null });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      const errorMsg = lastDisconnect?.error?.message ?? '';
      logger.info('[WhatsApp] Conexión cerrada', { metadata: { statusCode, reason: errorMsg } });

      clearSocket();

      if (statusCode === DisconnectReason.loggedOut) {
        logger.info('[WhatsApp] loggedOut — limpiando auth state');
        await prisma.whatsappAuthState.deleteMany();
        await updateSessionStatus({ status: 'disconnected', phoneNumber: null, qrCode: null });
        return;
      }

      // Handle corrupted signal sessions (Bad MAC = key material mismatch)
      if (errorMsg.includes('Bad MAC') || errorMsg.includes('decrypt')) {
        logger.info('[WhatsApp] Decryption failure — limpiando session keys (manteniendo creds)');
        await prisma.whatsappAuthState.deleteMany({
          where: { key: { not: 'creds' } },
        });
      }

      logger.info('[WhatsApp] Reintentando en 5s...');
      await updateSessionStatus({ status: 'connecting' });

      globalForWhatsApp.__reconnectTimeout = setTimeout(() => {
        initWhatsAppSocket().catch((err) => {
          logger.error('[WhatsApp] Error en reconexión:', { error: { name: 'WhatsAppReconnectError', message: String(err) } });
        });
      }, 5000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // No-op handler: prevents unhandled protocol message errors from propagating
  sock.ev.on('messages.upsert', () => {});

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
