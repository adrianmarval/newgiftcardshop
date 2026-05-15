import Link from 'next/link';
import { IconCreditCard, IconShoppingCart } from '@tabler/icons-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-neutral-950 p-6 text-white">
      {/* Hero */}
      <div className="space-y-3 text-center">
        <h1 className="text-6xl font-bold tracking-tight">{process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}</h1>
        <p className="mx-auto max-w-md text-xl text-neutral-400">
          The trusted marketplace for buying and selling gift cards at the best rates
        </p>
      </div>

      {/* Portal Cards */}
      <div className="flex w-full max-w-2xl flex-col gap-6 sm:flex-row">
        {/* Sell Portal */}
        <Link
          href="/sell/auth/login"
          className="group flex-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center transition-all hover:border-emerald-400/60 hover:bg-emerald-500/10"
        >
          <IconCreditCard className="mx-auto mb-4 h-10 w-10 text-emerald-400 transition-transform group-hover:scale-110" />
          <h2 className="mb-2 text-3xl font-semibold">I want to Sell</h2>
          <p className="text-base text-neutral-400">List your gift cards and earn money instantly</p>
        </Link>

        {/* Buy Portal */}
        <Link
          href="/buy/auth/login"
          className="group flex-1 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-8 text-center transition-all hover:border-blue-400/60 hover:bg-blue-500/10"
        >
          <IconShoppingCart className="mx-auto mb-4 h-10 w-10 text-blue-400 transition-transform group-hover:scale-110" />
          <h2 className="mb-2 text-3xl font-semibold">I want to Buy</h2>
          <p className="text-base text-neutral-400">Get discounted gift cards from verified sellers</p>
        </Link>
      </div>

      <p className="text-sm text-neutral-600">© {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}</p>
    </main>
  );
}
