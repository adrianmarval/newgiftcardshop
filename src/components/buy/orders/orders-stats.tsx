'use client';

import { History, Clock, CheckCircle2, CreditCard } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { OrdersStatsProps } from './types';

export function OrdersStats({ orders, totalCount }: OrdersStatsProps) {
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'AWAITING_PAYMENT').length;
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const totalSpent = orders.filter((o) => o.status === 'COMPLETED').reduce((acc, o) => acc + (o.adjustedTotal ?? o.total), 0);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
      <StatCard
        label="Total Órdenes"
        value={totalOrders}
        description={`${totalCount} órdenes encontradas`}
        icon={<History className="text-primary h-4 w-4" />}
      />
      <StatCard
        label="Órdenes Activas"
        value={activeOrders}
        description="Pendientes o esperando pago"
        icon={<Clock className="h-4 w-4 text-amber-500" />}
        color="text-amber-500"
      />
      <StatCard
        label="Completadas"
        value={completedOrders}
        description="Órdenes finalizadas"
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        color="text-emerald-500"
      />
      <StatCard
        label="Total Gastado"
        value={`$${totalSpent.toFixed(2)}`}
        description="En órdenes completadas"
        icon={<CreditCard className="h-4 w-4 text-blue-500" />}
        color="text-blue-500"
      />
    </div>
  );
}
