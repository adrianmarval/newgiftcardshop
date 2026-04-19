import { ReactNode } from 'react';

export default function BuyAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a1525] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a1525] to-[#0a1525]" />
      <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-light tracking-tight text-white">
            <span className="font-semibold text-blue-400">Solmaira</span> Buy
          </h2>
          <p className="mt-2 text-sm text-slate-400">Mercado de Tarjetas de Regalo</p>
        </div>
        {children}
      </div>
    </main>
  );
}
