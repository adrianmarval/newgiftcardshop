import { getPlatformSetting } from '@/actions/platform/settings';
import { ConfigManager } from './config-manager';

export const metadata = {
  title: 'Configuraciones de Plataforma | Admin',
};

export default async function ConfigurationPage() {
  const result = await getPlatformSetting();

  if (!result?.data?.success) {
    throw new Error('Failed to load platform settings');
  }

  return <ConfigManager initialSettings={result.data.settings} />;
}
