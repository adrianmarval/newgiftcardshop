'use client';

import { Clock, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { OrdersStatsProps } from './types';

export function OrdersStats({ orders }: OrdersStatsProps) {
  const activeOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'AWAITING_PAYMENT').length;
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
      <StatCard
        label="Órdenes Pendientes"
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
    </div>
  );
}
