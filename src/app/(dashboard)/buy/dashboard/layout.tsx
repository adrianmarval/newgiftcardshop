import { BuyerSidebar } from '@/components/layout/buyer-sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { authorizeByRequiredRole } from '@/lib/authorization';

export default async function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  await authorizeByRequiredRole(['BUYER', 'ADMIN']);
  return (
    <TooltipProvider>
      <div className="bg-background flex h-dvh flex-col overflow-hidden">
        <div className="flex-1 overflow-y-hidden px-2 py-4 md:p-8 md:pt-6">
          <div className="custom-scrollbar h-full overflow-y-auto pb-16">{children}</div>
        </div>
        <BuyerSidebar />
      </div>
    </TooltipProvider>
  );
}
