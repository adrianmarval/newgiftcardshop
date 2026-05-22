import { getPlatformSetting } from '@/actions/platform/settings';
import { ConfigManager } from './config-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configuraciones de Plataforma | Admin',
};

export default async function ConfigurationPage() {
  const result = await getPlatformSetting();

  if (!result?.data?.success) {
    throw new Error('Failed to load platform settings');
  }

  return (
    <div className="w-full space-y-4">
      <ConfigManager initialSettings={result.data.settings} />
    </div>
  );
}
