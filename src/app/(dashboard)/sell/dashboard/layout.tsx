import { DashboardLayout } from '@/components/layout';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout portal="admin" requiredRoles={['SELLER', 'ADMIN']}>
      {children}
    </DashboardLayout>
  );
}
