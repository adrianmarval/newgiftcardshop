import { SellerSidebar } from '@/components/layout/seller-sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="bg-background flex h-[100dvh] flex-col overflow-hidden">
        <div className="flex-1 overflow-y-hidden px-2 py-4 md:p-8 md:pt-6">
          <div className="custom-scrollbar h-full overflow-y-auto pb-20">{children}</div>
        </div>
        <SellerSidebar />
      </div>
    </TooltipProvider>
  );
}
