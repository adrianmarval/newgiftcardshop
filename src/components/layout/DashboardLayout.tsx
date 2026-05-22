import { Card } from '@/components/ui/card';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { authorizeByRequiredRole } from '@/lib/authorization';
import { AutoRefreshProvider } from '@/providers/auto-refresh-provider';
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
    <AutoRefreshProvider interval={15000}>
      <Card className="bg-background flex h-svh flex-col gap-2 p-1 ring-0 lg:flex-row lg:gap-4 lg:py-14 2xl:px-36">
        {/*main content*/}
        <Card className="order-1 flex-1 overflow-hidden py-0 lg:order-2">
          <div className="custom-scrollbar h-full w-full overflow-y-auto px-1 pt-2 pb-10 lg:p-4 lg:pb-4">{children}</div>
        </Card>

        {/*sidebar*/}
        <Card className="bg-background order-1 ring-0">
          <DashboardSidebar portal={portal} />
        </Card>
      </Card>
    </AutoRefreshProvider>
  );
};
