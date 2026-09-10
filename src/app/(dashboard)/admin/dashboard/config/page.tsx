import { getPlatformSetting } from '@/actions/platform';
import { ConfigManager } from '@/components/admin/config/config-manager';
import { Metadata } from 'next';
import { getAllProviders } from '@/lib/ai-provider-config';
import { authorizeByRequiredRole } from '@/lib/auth/authorization';

export const metadata: Metadata = {
  title: 'Configuraciones de Plataforma | Admin',
};

export default async function ConfigurationPage() {
  // Guard de página: lee prisma (via getAllProviders) y los layouts NO se
  // re-ejecutan en soft-nav entre páginas hermanas — la autorización no puede
  // depender solo del layout.
  await authorizeByRequiredRole(['ADMIN']);

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
