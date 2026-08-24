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
      <ConfigManager
        initialValues={result.data.values}
        initialAIProviders={aiProviders}
      />
    </div>
  );
}
