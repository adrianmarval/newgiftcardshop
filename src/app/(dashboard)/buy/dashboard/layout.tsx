import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { BuyerSidebar } from "@/components/layout/buyer-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireRoles } from "@/lib/get-session";

export default async function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(["BUYER", "ADMIN"], "/buy/auth/login");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 55)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <TooltipProvider>
        <BuyerSidebar variant="sidebar" />
        <SidebarInset>
          <AppHeader />
          <div className="flex-1 space-y-4 p-0 md:p-8 pt-4 md:pt-6">{children}</div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
