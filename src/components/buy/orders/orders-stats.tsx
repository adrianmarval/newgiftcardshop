"use client";

import { History, Clock, CheckCircle2, CreditCard } from "lucide-react";
import { MetricCardGrid } from "@/components/ui/metric-card-grid";
import type { OrdersStatsProps } from "@/types";

export function OrdersStats({ orders, totalCount }: OrdersStatsProps) {
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status === "PENDING" || o.status === "AWAITING_PAYMENT").length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
  const totalSpent = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((acc, o) => acc + (o.adjustedTotal ?? o.total), 0);

  const statsItems = [
    {
      label: "Total Orders",
      value: totalOrders,
      description: `${totalCount} orders found`,
      icon: <History className="w-4 h-4 text-primary" />,
    },
    {
      label: "Active Orders",
      value: activeOrders,
      description: "Pending or awaiting payment",
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      color: "amber-500",
    },
    {
      label: "Completed",
      value: completedOrders,
      description: "Orders fulfilled",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      color: "emerald-500",
    },
    {
      label: "Total Spent",
      value: `$${totalSpent.toFixed(2)}`,
      description: "On completed orders",
      icon: <CreditCard className="w-4 h-4 text-blue-500" />,
      color: "blue-500",
    },
  ];

  return <MetricCardGrid items={statsItems} />;
}
