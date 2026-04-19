import { ReactNode } from 'react';

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#120a1f] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-[#120a1f] to-[#120a1f]" />
      <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-500/5 blur-3xl" />
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-violet-500/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-light tracking-tight text-white">
            <span className="font-semibold text-violet-400">Solmaira</span> Admin
          </h2>
          <p className="mt-2 text-sm text-slate-400">Portal de Administración</p>
        </div>
        {children}
      </div>
    </main>
  );
}
