import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireRoles } from "@/lib/get-session";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(["ADMIN"], "/admin/auth/login");

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
        <AdminSidebar variant="sidebar" />
        <SidebarInset>
          <AppHeader />
          {children}
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
