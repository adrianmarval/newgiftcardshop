import { getPlatformSetting } from '@/actions/platform';
import { ConfigManager } from '@/components/admin/config/config-manager';
import { Metadata } from 'next';
import { getAllProviders } from '@/lib/ai-provider-config';

export const metadata: Metadata = {
  title: 'Configuraciones de Plataforma | Admin',
};

export default async function ConfigurationPage() {
  const [result, aiProviders] = await Promise.all([
    getPlatformSetting(),
    getAllProviders(),
  ]);

  if (!result?.data?.success) {
    throw new Error('Failed to load platform settings');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Platform Settings</h1>
      <ConfigManager
        initialSettings={result.data.settings}
        initialAIProviders={aiProviders}
      />
    </div>
  );
}
