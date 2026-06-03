import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { authorizeByRequiredRole } from '@/lib/authorization';
import { AutoRefreshProvider } from '@/providers/auto-refresh-provider';
import { NotificationProvider } from '@/contexts/notification-context';
import { AppSection } from '@/types';
import { Role } from '@/generated/prisma/enums';

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
        <div className="flex h-svh flex-col py-2 ring-0 lg:flex-row lg:gap-4 lg:py-14 2xl:px-40">
          {/*main content*/}
          <div className="order-1 flex-10 overflow-hidden md:rounded-t-2xl lg:order-2">
            <div className="custom-scrollbar h-full overflow-x-hidden overflow-y-auto p-1">{children}</div>
          </div>

          {/*sidebar*/}
          <div className="bg-background order-1 flex-1 p-0 ring-0">
            <DashboardSidebar portal={portal} />
          </div>
        </div>
      </AutoRefreshProvider>
    </NotificationProvider>
  );
};
