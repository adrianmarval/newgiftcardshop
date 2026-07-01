import { getPlatformSetting } from '@/actions/platform';
import { ConfigManager } from '@/components/admin/config/config-manager';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { getAllProviders } from '@/lib/ai-provider-config';

export const metadata: Metadata = {
  title: 'Configuraciones de Plataforma | Admin',
};

export default async function ConfigurationPage() {
  const [result, whatsappSession, aiProviders] = await Promise.all([
    getPlatformSetting(),
    prisma.whatsappSession.findFirst(),
    getAllProviders(),
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
      initialAIProviders={aiProviders}
    />
  );
}
