import { BuyerSidebar } from '@/components/layout/buyer-sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default async function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="bg-background min-h-screen pb-20">
        <div className="flex-1 space-y-4 px-2 py-4 md:p-8 md:pt-6">{children}</div>
        <BuyerSidebar />
      </div>
    </TooltipProvider>
  );
}
