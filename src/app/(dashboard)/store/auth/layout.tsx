import { ReactNode } from 'react';
import { AuthLayout } from '@/components/layout';

export default function BuyAuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthLayout
      bgColor="bg-[#0a1525]"
      gradientFrom="from-blue-900/20"
      gradientVia="via-[#0a1525]"
      blobBg="bg-blue-500/5"
      accentText="text-blue-400"
      title="Buy"
      subtitle="Mercado de Tarjetas de Regalo"
    >
      {children}
    </AuthLayout>
  );
}
