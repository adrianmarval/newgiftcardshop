import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout portal="admin" requiredRoles={['ADMIN']}>
      {children}
    </DashboardLayout>
  );
}
