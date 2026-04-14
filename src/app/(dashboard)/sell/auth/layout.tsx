import { ReactNode } from 'react';

export default function SellAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-emerald-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-white">Solmaira Sell</h2>
          <p className="mt-1 text-lg text-emerald-300/70">Gift Card Seller Portal</p>
        </div>
        {children}
      </div>
    </main>
  );
}
