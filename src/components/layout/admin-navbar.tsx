'use client';

import { IconDashboard, IconUsers, IconShoppingCart, IconCreditCard, IconChartBar, IconCash } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';

const navItems = [
  { title: 'Home', url: '/admin/dashboard', icon: IconDashboard },
  { title: 'Usuarios', url: '/admin/dashboard/users', icon: IconUsers },
  {
    title: 'Ordenes',
    url: '/admin/dashboard/orders',
    icon: IconShoppingCart,
  },
  {
    title: 'Lotes',
    url: '/admin/dashboard/batches',
    icon: IconCreditCard,
  },
  { title: 'Pagos', url: '/admin/dashboard/payments', icon: IconCash },
  {
    title: 'Analiticas',
    url: '/admin/dashboard/analytics',
    icon: IconChartBar,
  },
];

export const AdminNavbar = ({ isFixed }: { isFixed?: boolean }) => {
  return <BottomNav items={navItems} variant="compact" isFixed={isFixed} />;
};
