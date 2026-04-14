'use client';

import { History, Clock, CheckCircle2, CreditCard } from 'lucide-react';
import { MetricCardGrid } from '@/components/ui/metric-card-grid';
import type { OrdersStatsProps } from './types';

export function OrdersStats({ orders, totalCount }: OrdersStatsProps) {
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'AWAITING_PAYMENT').length;
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const totalSpent = orders.filter((o) => o.status === 'COMPLETED').reduce((acc, o) => acc + (o.adjustedTotal ?? o.total), 0);

  const statsItems = [
    {
      label: 'Total Órdenes',
      value: totalOrders,
      description: `${totalCount} órdenes encontradas`,
      icon: <History className="text-primary h-4 w-4" />,
    },
    {
      label: 'Órdenes Activas',
      value: activeOrders,
      description: 'Pendientes o esperando pago',
      icon: <Clock className="h-4 w-4 text-amber-500" />,
      color: 'amber-500',
    },
    {
      label: 'Completadas',
      value: completedOrders,
      description: 'Órdenes finalizadas',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      color: 'emerald-500',
    },
    {
      label: 'Total Gastado',
      value: `$${totalSpent.toFixed(2)}`,
      description: 'En órdenes completadas',
      icon: <CreditCard className="h-4 w-4 text-blue-500" />,
      color: 'blue-500',
    },
  ];

  return <MetricCardGrid items={statsItems} />;
}
