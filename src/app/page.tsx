import Link from "next/link";
import { IconCreditCard, IconShoppingCart } from "@tabler/icons-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-12 p-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-bold tracking-tight">Solmaira Cards</h1>
        <p className="text-lg text-neutral-400 max-w-md mx-auto">
          The trusted marketplace for buying and selling gift cards at the best rates
        </p>
      </div>

      {/* Portal Cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* Sell Portal */}
        <Link
          href="/sell/auth/login"
          className="group flex-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center transition-all hover:border-emerald-400/60 hover:bg-emerald-500/10"
        >
          <IconCreditCard className="h-10 w-10 mx-auto mb-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <h2 className="text-2xl font-semibold mb-2">I want to Sell</h2>
          <p className="text-neutral-400 text-sm">List your gift cards and earn money instantly</p>
        </Link>

        {/* Buy Portal */}
        <Link
          href="/buy/auth/login"
          className="group flex-1 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-8 text-center transition-all hover:border-blue-400/60 hover:bg-blue-500/10"
        >
          <IconShoppingCart className="h-10 w-10 mx-auto mb-4 text-blue-400 group-hover:scale-110 transition-transform" />
          <h2 className="text-2xl font-semibold mb-2">I want to Buy</h2>
          <p className="text-neutral-400 text-sm">Get discounted gift cards from verified sellers</p>
        </Link>
      </div>

      <p className="text-xs text-neutral-600">© 2025 Solmaira Cards</p>
    </main>
  );
}
