import { ReactNode } from "react";

export default function BuyAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-linear-to-br from-blue-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white">Solmaira Buy</h2>
          <p className="text-blue-300/70 mt-1">Gift Card Marketplace</p>
        </div>
        {children}
      </div>
    </main>
  );
}
