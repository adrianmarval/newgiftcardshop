import { SellerNavbar } from '@/components/layout/seller-navbar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { authorizeByRequiredRole } from '@/lib/authorization';

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  await authorizeByRequiredRole(['SELLER', 'ADMIN']);
  return (
    <TooltipProvider>
      <nav className="grid h-svh w-full grid-cols-1 grid-rows-[1fr_auto] gap-1 p-1 md:gap-4 md:p-4">
        {/* 2: CONTENT - Full width always */}
        <main className="bg-background relative col-span-1 overflow-hidden rounded-lg md:col-span-1">
          <div className="custom-scrollbar text-muted-foreground h-full overflow-y-auto italic md:p-2">{children}</div>
        </main>

        {/* 3: NAV/FOOTER - Full width always */}
        <footer className="bg-card/80 col-span-1 flex items-center justify-center rounded-lg border p-3 shadow-lg backdrop-blur-xl md:col-span-1">
          <div className="flex w-full max-w-md justify-around">
            <div className="bg-primary/5 hover:bg-primary/10 border-primary/10 rounded-lg-xl flex h-10 w-10 cursor-pointer items-center justify-center border transition-colors">
              <SellerNavbar />
            </div>
          </div>
        </footer>
      </nav>
    </TooltipProvider>
  );
}
