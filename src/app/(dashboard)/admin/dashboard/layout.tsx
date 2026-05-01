import { AdminNavbar } from '@/components/layout/admin-navbar';
import { authorizeByRequiredRole } from '@/lib/authorization';
import { AutoRefreshProvider } from '@/providers/auto-refresh-provider';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await authorizeByRequiredRole(['ADMIN']);
  return (
    <AutoRefreshProvider interval={5000}>
      <nav className="md:gap-4- grid h-svh w-full grid-cols-1 grid-rows-[1fr_auto] gap-1 p-1">
        <main className="bg-background relative col-span-1 overflow-hidden rounded-lg md:col-span-1">
          <div className="custom-scrollbar text-muted-foreground mx-auto h-full max-w-6xl overflow-y-auto italic md:p-2">{children}</div>
        </main>
        <footer className="col-span-1 mx-auto flex w-full max-w-6xl items-center justify-center md:col-span-1">
          <AdminNavbar />
        </footer>
      </nav>
    </AutoRefreshProvider>
  );
}
