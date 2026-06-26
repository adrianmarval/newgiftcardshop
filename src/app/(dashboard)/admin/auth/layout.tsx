import { ReactNode } from 'react';
import { AuthLayout } from '@/components/layout';

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthLayout
      bgColor="bg-[#120a1f]"
      gradientFrom="from-violet-900/20"
      gradientVia="via-[#120a1f]"
      blobBg="bg-violet-500/5"
      accentText="text-violet-400"
      title="Admin"
      subtitle="Portal de Administración"
    >
      {children}
    </AuthLayout>
  );
}
