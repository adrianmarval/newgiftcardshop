import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const metadata: Metadata = {
  manifest: '/manifests/buy.webmanifest',
};

export default async function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout portal="buy" requiredRoles={['ADMIN', 'BUYER']}>
      {children}
    </DashboardLayout>
  );
}
