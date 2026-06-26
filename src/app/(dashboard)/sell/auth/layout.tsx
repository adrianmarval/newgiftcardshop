import { ReactNode } from 'react';
import { AuthLayout } from '@/components/layout';

export default function SellAuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthLayout
      bgColor="bg-[#0a1a1a]"
      gradientFrom="from-emerald-900/20"
      gradientVia="via-slate-950"
      blobBg="bg-emerald-500/5"
      accentText="text-emerald-400"
      title="Sell"
      subtitle="Gift Card Seller Portal"
    >
      {children}
    </AuthLayout>
  );
}
