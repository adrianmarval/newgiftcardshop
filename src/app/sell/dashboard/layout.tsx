import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SellerSidebar } from "@/components/layout/seller-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireRoles } from "@/lib/get-session";

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(["SELLER", "ADMIN"], "/sell/auth/login");

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
        <SellerSidebar variant="sidebar" />
        <SidebarInset>
          <AppHeader />
          {children}
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
