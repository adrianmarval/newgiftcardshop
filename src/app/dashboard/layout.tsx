import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/";
import { AppHeader } from "@/components/layout/";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Layout({ children }: { children: React.ReactNode }) {
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
        <AppSidebar variant="sidebar" />
        <SidebarInset>
          <AppHeader />
          {children}
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
