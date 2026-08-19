'use client';

import Link from 'next/link';
import { IconSearch, IconShoppingBag, IconClock } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { BuyerStats, OrderBookEntry } from '@/types';
import { timeAgo } from '@/lib/utils';

interface BuyerDashboardProps {
  stats: BuyerStats;
}

function UserAvatar({ email }: { email: string }) {
  const local = email.split('@')[0] || '?';
  const initials = local.length >= 2 ? local.slice(0, 2).toUpperCase() : local.toUpperCase();

  const hue = Array.from(email).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: `hsl(${hue}, 50%, 40%)` }}
    >
      {initials}
    </div>
  );
}

function OrderBookRow({ entry }: { entry: OrderBookEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <UserAvatar email={entry.buyerEmail} />
        <span className="truncate font-mono text-xs">{entry.buyerEmail}</span>
      </div>

      <div className="hidden items-center gap-4 sm:flex">
        <span className="text-muted-foreground text-xs">
          {entry.cardCount} card{entry.cardCount !== 1 ? 's' : ''}
        </span>
        <span className="font-semibold">${entry.total.toFixed(2)}</span>
        <span className="text-muted-foreground w-12 text-right text-xs">{timeAgo(entry.createdAt)}</span>
      </div>

      <div className="flex flex-col items-end gap-0.5 sm:hidden">
        <span className="font-semibold">${entry.total.toFixed(2)}</span>
        <span className="text-muted-foreground text-xs">{timeAgo(entry.createdAt)}</span>
      </div>
    </div>
  );
}

export function BuyerDashboard({ stats }: BuyerDashboardProps) {
  const { orderBook } = stats;

  return (
    <div className="w-full space-y-2">
      <section>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center gap-1">
              <Link href="/store/dashboard/browse-cards" className="group inline-flex items-center gap-1">
                <IconSearch className="text-muted-foreground h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
                <CardTitle className="text-base group-hover:underline">Disponibles</CardTitle>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${stats.availableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              </p>
              <p className="text-muted-foreground text-sm">{stats.availableCards.toLocaleString()} cards en inventario</p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center gap-1">
              <IconShoppingBag className="h-6 w-6 text-blue-500" />
              <CardTitle className="text-base">Total Vendido HOY</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${orderBook.totalTradedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-muted-foreground text-sm">
                {orderBook.totalOrdersToday} orden{orderBook.totalOrdersToday !== 1 ? 'es' : ''} hoy
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2">
          <IconClock className="text-muted-foreground h-5 w-5" />
          <h2 className="text-xl font-semibold">Libro de Órdenes</h2>
        </div>
        <p className="text-muted-foreground mb-2 text-sm">Órdenes Recientes</p>

        {orderBook.entries.length > 0 ? (
          <div className="space-y-1">
            {orderBook.entries.map((entry) => (
              <OrderBookRow key={entry.orderId} entry={entry} />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardDescription>No hay actividad hoy aún. Sé el primero en comprar gift cards.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>
    </div>
  );
}
