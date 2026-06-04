import Link from 'next/link';
import { IconCreditCard } from '@tabler/icons-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-neutral-950 p-6 text-white">
      {/* Hero */}
      <div className="space-y-3 text-center">
        <h1 className="text-6xl font-bold tracking-tight">{process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}</h1>
        <p className="mx-auto max-w-md text-xl text-neutral-400">
          The fastest and most secure way to sell your gift cards for instant cash.
        </p>
      </div>

      {/* Portal Card */}
      <div className="flex w-full max-w-md flex-col gap-6">
        {/* Sell Portal */}
        <Link
          href="/sell/auth/login"
          className="group flex-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center transition-all hover:border-emerald-400/60 hover:bg-emerald-500/10"
        >
          <IconCreditCard className="mx-auto mb-2 h-10 w-10 text-emerald-400 transition-transform group-hover:scale-110" />
          <h2 className="mb-2 text-3xl font-semibold">Start Selling</h2>
          <p className="text-base text-neutral-400">Login or register to submit your cards securely.</p>
        </Link>
      </div>

      <p className="text-sm text-neutral-600">
        © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}
      </p>
    </main>
  );
}
