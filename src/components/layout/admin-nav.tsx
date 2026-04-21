'use client';

import * as React from 'react';
import { IconDashboard, IconUsers, IconShoppingCart, IconCreditCard, IconChartBar, IconCash } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';

const navItems = [
  { title: 'Home', url: '/admin/dashboard', icon: IconDashboard },
  { title: 'Users', url: '/admin/dashboard/users', icon: IconUsers },
  {
    title: 'Orders',
    url: '/admin/dashboard/orders',
    icon: IconShoppingCart,
  },
  {
    title: 'Cards',
    url: '/admin/dashboard/cards',
    icon: IconCreditCard,
  },
  {
    title: 'Stats',
    url: '/admin/dashboard/analytics',
    icon: IconChartBar,
  },
  { title: 'Pagos', url: '/admin/dashboard/payments', icon: IconCash },
];

export const AdminSidebar = () => {
  return <BottomNav items={navItems} />;
};
