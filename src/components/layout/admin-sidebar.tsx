'use client';

import * as React from 'react';
import {
  IconDashboard,
  IconUsers,
  IconShoppingCart,
  IconCreditCard,
  IconChartBar,
  IconCash,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import { Sidebar } from '@/components/ui/sidebar';
import { PortalSidebar } from './app-sidebar';

const navItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: IconDashboard },
  { title: 'Usuarios', url: '/admin/dashboard/users', icon: IconUsers },
  {
    title: 'Todas las Órdenes',
    url: '/admin/dashboard/orders',
    icon: IconShoppingCart,
  },
  {
    title: 'Tarjetas de Regalo',
    url: '/admin/dashboard/cards',
    icon: IconCreditCard,
  },
  {
    title: 'Estadísticas',
    url: '/admin/dashboard/analytics',
    icon: IconChartBar,
  },
  { title: 'Pagos', url: '/admin/dashboard/payments', icon: IconCash },
  { title: 'Perfil', url: '/admin/dashboard/profile', icon: IconUser },
  { title: 'Ajustes', url: '/admin/dashboard/settings', icon: IconSettings },
];

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <PortalSidebar
      navItems={navItems}
      brandLabel="Solmaira Admin"
      brandHref="/admin/dashboard"
      groupLabel="Gestión"
      portal="admin"
      logoutVariant="ghost"
      {...props}
    />
  );
}
