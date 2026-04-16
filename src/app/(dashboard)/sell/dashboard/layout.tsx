import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SellerSidebar } from '@/components/layout/seller-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { TooltipProvider } from '@/components/ui/tooltip';

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 55)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <TooltipProvider>
        <SellerSidebar variant="sidebar" />
        <SidebarInset>
          <AppHeader />
          <div className="flex-1 space-y-4 p-0 pt-0 md:p-8 md:pt-6">{children}</div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
