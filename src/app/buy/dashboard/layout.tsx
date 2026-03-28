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
          {/* <AppHeader /> */}
          {children}
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
