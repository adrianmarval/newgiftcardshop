'use client';

import Link from 'next/link';
import Image from 'next/image';
import { IconPlus, IconGift, IconSearch, IconShoppingCart, IconClock, IconPigMoney } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { BuyerStats, BuyerOrder } from '@/types/domain/order';
import { StatCard } from '@/components/ui/stat-card';

interface BuyerDashboardClientProps {
  stats: BuyerStats;
  activeOrders: BuyerOrder[];
}

export function BuyerDashboardClient({ stats, activeOrders }: BuyerDashboardClientProps) {
  return (
    <div className="container mx-auto space-y-4">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Estadísticas</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Disponibles"
            value={stats.availableCards.toLocaleString()}
            icon={<IconSearch className="text-muted-foreground h-6 w-6" />}
          />
          <StatCard
            title="Mis Órdenes"
            value={stats.myOrders.toLocaleString()}
            icon={<IconShoppingCart className="text-muted-foreground h-6 w-6" />}
          />
          <StatCard title="Activas" value={stats.activeOrders.toLocaleString()} icon={<IconClock className="h-6 w-6 text-yellow-500" />} />
          <StatCard title="Ahorrado" value={stats.totalSaved.toLocaleString()} icon={<IconPigMoney className="h-6 w-6 text-green-500" />} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Acciones Rápidas</h2>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Comprar Gift Cards</CardTitle>
                <CardDescription>Buscar gift cards para comprar</CardDescription>
              </div>
              <Link
                href="/buy/dashboard/browse-cards"
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-2 py-2 font-medium"
              >
                <IconPlus className="h-4 w-4" />
                Buscar Giftcards
              </Link>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Órdenes Activas</h2>
          <Link href="/buy/dashboard/orders" className="text-primary text-sm hover:underline">
            Ver todas →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeOrders.length > 0 ? (
            activeOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="flex flex-row items-center gap-3">
                  {order.giftcards[0]?.brand.image ? (
                    <div className="relative h-10 w-10">
                      <Image
                        src={order.giftcards[0].brand.image}
                        alt={order.giftcards[0].brand.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <span className="text-2xl">{order.giftcards[0]?.brand.icon || '🛒'}</span>
                  )}
                  <div>
                    <CardTitle className="text-base">Orden #{order.id.slice(0, 8)}</CardTitle>
                    <CardDescription>{order.giftcards.length} cards</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">${order.total}</p>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        order.status === 'PENDING' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {order.status === 'PENDING' ? 'Pendiente' : 'Esperando Pago'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <IconGift className="text-muted-foreground h-6 w-6" />
                  <CardDescription>No hay órdenes activas. Busca gift cards para comenzar.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
