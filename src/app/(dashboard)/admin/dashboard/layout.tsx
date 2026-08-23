import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const metadata: Metadata = {
  manifest: '/manifests/admin.webmanifest',
};

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout portal="admin" requiredRoles={['ADMIN']}>
      {children}
    </DashboardLayout>
  );
}
