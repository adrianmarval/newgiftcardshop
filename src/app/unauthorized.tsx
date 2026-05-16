import Link from 'next/link';
import { headers } from 'next/headers';

export default async function UnauthorizedPage() {
  const headerList = await headers();
  const pathname = headerList.get('x-current-path');

  const loginPath = pathname?.startsWith('/admin')
    ? '/admin/auth/login'
    : pathname?.startsWith('/sell')
      ? '/sell/auth/login'
      : '/store/auth/login';

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-100/10 text-red-800 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-red-800 lg:text-5xl">Acceso Denegado!</h1>

      <p className="text-muted-foreground mb-8 max-w-md text-xl">
        No tenés los permisos necesarios para ver esta página, o tu sesión expiró.
      </p>

      <div className="flex gap-4">
        <Link
          href={loginPath}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold shadow-lg transition-all outline-none hover:scale-105 focus:ring-2 focus:ring-offset-2"
        >
          Iniciar Sesión
        </Link>
        <Link
          href="/"
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-ring inline-flex items-center justify-center rounded-full border px-8 py-3 text-sm font-semibold transition-all outline-none hover:scale-105 focus:ring-2 focus:ring-offset-2"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
