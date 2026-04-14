import { ReactNode } from 'react';

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-violet-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-white">Solmaira Admin</h2>
          <p className="mt-1 text-lg text-violet-300/70">Portal de Administración</p>
        </div>
        {children}
      </div>
    </main>
  );
}
