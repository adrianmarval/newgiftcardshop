import { SellerNavbar } from '@/components/layout/seller-navbar';
import { Card, CardContent } from '@/components/ui/card';
import { authorizeByRequiredRole } from '@/lib/authorization';
import { AutoRefreshProvider } from '@/providers/auto-refresh-provider';

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  await authorizeByRequiredRole(['SELLER', 'ADMIN']);
  return (
    <AutoRefreshProvider interval={15000}>
      <Card className="bg-background flex h-svh flex-col gap-2 p-1 ring-0 lg:flex-row lg:gap-4 lg:p-4">
        {/* Sidebar / Bottom Bar Container */}
        <Card className="order-2 flex shrink-0 items-center justify-center p-0 lg:order-1">
          <SellerNavbar />
        </Card>

        {/* Main Content */}
        <Card className="relative order-1 flex-1 overflow-hidden lg:order-2">
          <CardContent className="h-full w-full overflow-y-scroll p-2 md:p-4">{children}</CardContent>
        </Card>
      </Card>
    </AutoRefreshProvider>
  );
}
