import { ReactNode } from 'react';

export default function BuyAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-white">Solmaira Buy</h2>
          <p className="mt-1 text-lg text-blue-300/70">Mercado de Tarjetas de Regalo</p>
        </div>
        {children}
      </div>
    </main>
  );
}
