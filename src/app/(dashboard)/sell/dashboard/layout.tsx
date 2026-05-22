import { Card } from '@/components/ui/card';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { authorizeByRequiredRole } from '@/lib/authorization';
import { AutoRefreshProvider } from '@/providers/auto-refresh-provider';

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  await authorizeByRequiredRole(['SELLER', 'ADMIN']);

  return (
    <AutoRefreshProvider interval={15000}>
      <Card className="bg-background flex h-svh flex-col gap-2 p-1 ring-0 lg:flex-row lg:gap-4 lg:px-4 lg:py-8">
        <Card className="order-1 flex-1 overflow-hidden py-0 lg:order-2">
          <div className="custom-scrollbar h-full w-full overflow-y-auto px-1 py-2 lg:p-4 lg:pb-4">{children}</div>
        </Card>

        <Card className="bg-background order-1 ring-0">
          <DashboardSidebar portal="sell" />
        </Card>
      </Card>
    </AutoRefreshProvider>
  );
}
