import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="bg-background min-h-screen pb-20">
        <div className="flex-1 space-y-4 p-4 md:p-8 md:pt-6">{children}</div>
        <AdminSidebar />
      </div>
    </TooltipProvider>
  );
}
