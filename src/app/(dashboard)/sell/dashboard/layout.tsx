import { SellerNavbar } from '@/components/layout/seller-navbar';
import { authorizeByRequiredRole } from '@/lib/authorization';

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  await authorizeByRequiredRole(['SELLER', 'ADMIN']);
  return (
    <nav className="grid h-svh w-full grid-cols-1 grid-rows-[1fr_auto] gap-1 p-1 md:gap-4 md:p-4">
      {/* 2: CONTENT - Full width always */}
      <main className="bg-background relative col-span-1 mx-auto w-full max-w-6xl overflow-hidden rounded-lg md:col-span-1">
        <div className="custom-scrollbar text-muted-foreground h-full overflow-y-auto italic md:p-2">{children}</div>
      </main>

      {/* 3: NAV/FOOTER - Full width always */}
      <footer className="col-span-1 mx-auto flex w-full max-w-6xl items-center justify-center md:col-span-1">
        <SellerNavbar />
      </footer>
    </nav>
  );
}
