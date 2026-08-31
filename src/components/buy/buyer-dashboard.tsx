'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  IconSearch,
  IconShoppingBag,
  IconClock,
  IconCreditCard,
  IconCircleCheck,
  IconAlertTriangle,
  IconChevronRight,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/common';
import { LiveAvailabilityGrid, type LiveAvailabilityItem } from '@/components/buy/live-availability-grid';
import { orderStatusConfig } from '@/lib/config';
import { formatCurrency } from '@/lib/utils';
import type { BuyerStats, OrderBookEntry, RecentOrder } from '@/types';
import { timeAgo } from '@/lib/utils';

interface BuyerDashboardProps {
  stats: BuyerStats;
  recentOrders: RecentOrder[];
  availability: LiveAvailabilityItem[];
}

function CreditUsageCard({
  creditLimit,
  unpaidFaceValue,
  unpaidUsdt,
  availableCredit,
  pendingOrdersCount,
}: {
  creditLimit: number;
  unpaidFaceValue: number;
  unpaidUsdt: number;
  availableCredit: number;
  pendingOrdersCount: number;
}) {
  const usagePercent = creditLimit > 0 ? Math.min((unpaidFaceValue / creditLimit) * 100, 100) : 0;
  const barColor =
    usagePercent >= 80
      ? 'bg-red-500'
      : usagePercent >= 50
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const hasDebt = unpaidFaceValue > 0;

  return (
    <Card size="sm" className="col-span-2 lg:col-span-2" data-tour="buy-credit">
      <CardHeader className="flex flex-row items-center gap-1">
        <IconCreditCard className={`h-6 w-6 ${hasDebt ? 'text-amber-500' : 'text-muted-foreground'}`} />
        <CardTitle className="text-base">Límite de Crédito</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Crédito utilizado</span>
            <span className="font-medium">{usagePercent.toFixed(0)}%</span>
          </div>
          <Progress value={usagePercent} className="h-2.5">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usagePercent}%` }} />
          </Progress>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(unpaidFaceValue)} GC</span>
            <span>{formatCurrency(creditLimit)} GC</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-2.5 text-sm">
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs">Deuda a pagar</p>
            <p className="text-lg font-bold text-amber-500">{formatCurrency(unpaidUsdt)}</p>
            <p className="text-muted-foreground text-[10px]">USDT (con descuento)</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs">Crédito restante</p>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(availableCredit)}</p>
            <p className="text-muted-foreground text-[10px]">GC (face value)</p>
          </div>
        </div>

        {pendingOrdersCount > 0 && (
          <p className="text-muted-foreground text-xs">
            {pendingOrdersCount} orden{pendingOrdersCount !== 1 ? 'es' : ''} pendiente{pendingOrdersCount !== 1 ? 's' : ''} por pagar
          </p>
        )}
      </CardContent>
    </Card>
  );
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
          {entry.cardCount} tarjeta{entry.cardCount !== 1 ? 's' : ''}
        </span>
        <span className="font-semibold">{formatCurrency(entry.total)}</span>
        <span className="text-muted-foreground w-12 text-right text-xs">{timeAgo(entry.createdAt)}</span>
      </div>

      <div className="flex flex-col items-end gap-0.5 sm:hidden">
        <span className="font-semibold">{formatCurrency(entry.total)}</span>
        <span className="text-muted-foreground text-xs">{timeAgo(entry.createdAt)}</span>
      </div>
    </div>
  );
}

function RecentOrderRow({ order, onClick }: { order: RecentOrder; onClick: () => void }) {
  const status = orderStatusConfig[order.status];

  return (
    <button
      onClick={onClick}
      className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
    >
      {order.giftcards[0]?.brand.image ? (
        <div className="relative h-8 w-8 shrink-0">
          <Image src={order.giftcards[0].brand.image} alt={order.giftcards[0].brand.name} fill className="object-contain" />
        </div>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">{order.giftcards[0]?.brand.icon || '🎁'}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Orden #{order.id.slice(-8)}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {order.cardsCount} tarjeta{order.cardsCount !== 1 ? 's' : ''} · {new Date(order.createdAt).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
        </p>
      </div>
      <span className="text-sm font-semibold">{formatCurrency(order.effectiveTotal)}</span>
      <IconChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
    </button>
  );
}

export function BuyerDashboard({ stats, recentOrders, availability }: BuyerDashboardProps) {
  const router = useRouter();
  const { personal, orderBook } = stats;

  return (
    <div className="w-full space-y-2">
      <LiveAvailabilityGrid items={availability} />

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Mis Estadísticas</h2>
        <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
          <CreditUsageCard
            creditLimit={personal.creditLimit}
            unpaidFaceValue={personal.unpaidFaceValue}
            unpaidUsdt={personal.unpaidUsdt}
            availableCredit={personal.availableCredit}
            pendingOrdersCount={personal.pendingOrdersCount}
          />
          <StatCard
            title="Total Ahorrado"
            value={formatCurrency(personal.totalSaved)}
            icon={<IconCircleCheck className="h-6 w-6 text-emerald-500" />}
            description="En total de órdenes completadas"
          />
          <StatCard
            title="Compras del Mes"
            value={formatCurrency(personal.monthSpend)}
            icon={<IconShoppingBag className="h-6 w-6 text-blue-500" />}
            description={`${personal.monthOrdersCount} orden${personal.monthOrdersCount !== 1 ? 'es' : ''} este mes`}
          />
          <StatCard
            title="Problemas Reportados"
            value={personal.reportedIssues.toString()}
            icon={<IconAlertTriangle className={`h-6 w-6 ${personal.reportedIssues > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />}
            description="Tarjetas con problemas"
          />
        </div>
      </section>

      <section className="space-y-2" data-tour="buy-recent-orders">
        <div className="flex items-center gap-2">
          <IconClock className="text-muted-foreground h-5 w-5" />
          <h2 className="text-xl font-semibold">Órdenes Recientes</h2>
        </div>

        {recentOrders.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentOrders.map((order) => (
                  <RecentOrderRow
                    key={order.id}
                    order={order}
                    onClick={() => router.push(`/store/dashboard/orders?search=${order.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardDescription>No tienes órdenes aún. Explora las tarjetas disponibles para empezar.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between p-1">
          <h2 className="text-xl font-semibold">Marketplace</h2>
          <Link href="/store/dashboard/browse-cards" className="text-primary text-sm hover:underline">
            Ver todas
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center gap-1">
              <IconSearch className="text-muted-foreground h-6 w-6" />
              <CardTitle className="text-base">Total Vendido HOY</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(orderBook.totalTradedToday)}
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
        <p className="text-muted-foreground mb-2 text-sm">Órdenes Recientes de la Plataforma</p>

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
