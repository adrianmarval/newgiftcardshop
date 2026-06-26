import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout portal="sell" requiredRoles={['SELLER', 'ADMIN']}>
      {children}
    </DashboardLayout>
  );
}
