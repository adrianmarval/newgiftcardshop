import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { authorizeByRequiredRole } from '@/lib/authorization';
import { AutoRefreshProvider } from '@/providers/auto-refresh-provider';
import { NotificationProvider } from '@/contexts/notification-context';
import { AppSection } from '@/types';
import { Role } from '@/generated/prisma/enums';
import { Card } from '../ui/card';

interface DashboardLayoutProps {
  children: React.ReactNode;
  portal: AppSection;
  requiredRoles: Role[];
}

export const DashboardLayout = async ({ children, portal, requiredRoles }: DashboardLayoutProps) => {
  await authorizeByRequiredRole(requiredRoles);

  return (
    <NotificationProvider>
      <AutoRefreshProvider interval={15000}>
        <div className="flex h-svh flex-col pb-2 ring-0 lg:flex-row lg:gap-1 lg:py-14 2xl:px-40">
          {/*main content*/}
          <Card className="order-1 flex-10 overflow-hidden rounded-none py-0 shadow-2xl md:rounded-t-4xl md:p-4 lg:order-2">
            <div className="custom-scrollbar h-full overflow-x-hidden overflow-y-auto p-1">{children}</div>
          </Card>

          {/*sidebar*/}
          <div className="bg-background order-1 flex-1 p-0 ring-0">
            <DashboardSidebar portal={portal} />
          </div>
        </div>
      </AutoRefreshProvider>
    </NotificationProvider>
  );
};
