import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const metadata: Metadata = {
  manifest: '/manifests/sell.webmanifest',
};

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout portal="sell" requiredRoles={['SELLER', 'ADMIN']}>
      {children}
    </DashboardLayout>
  );
}
