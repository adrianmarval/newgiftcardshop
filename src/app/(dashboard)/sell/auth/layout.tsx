import { ReactNode } from "react";

export default function SellAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-linear-to-br from-emerald-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white">Solmaira Sell</h2>
          <p className="text-emerald-300/70 mt-1">Gift Card Seller Portal</p>
        </div>
        {children}
      </div>
    </main>
  );
}
