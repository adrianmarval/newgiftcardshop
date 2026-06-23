import { getPlatformSetting } from '@/actions/platform/settings';
import { ConfigManager } from './config-manager';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Configuraciones de Plataforma | Admin',
};

export default async function ConfigurationPage() {
  const [result, whatsappSession] = await Promise.all([
    getPlatformSetting(),
    prisma.whatsappSession.findFirst(),
  ]);

  if (!result?.data?.success) {
    throw new Error('Failed to load platform settings');
  }

  return (
    <ConfigManager
      initialSettings={result.data.settings}
      initialWhatsAppStatus={{
        status: whatsappSession?.status ?? 'disconnected',
        phoneNumber: whatsappSession?.phoneNumber ?? null,
      }}
    />
  );
}
