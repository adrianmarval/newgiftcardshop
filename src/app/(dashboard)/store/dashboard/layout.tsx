import { DashboardLayout } from '@/components/layout';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout portal="buy" requiredRoles={['ADMIN', 'BUYER']}>
      {children}
    </DashboardLayout>
  );
}
