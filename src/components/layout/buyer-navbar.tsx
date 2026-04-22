'use client';

import { IconDashboard, IconUser, IconHistory, IconShoppingCart } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';

const navItems = [
  { title: 'Inicio', url: '/buy/dashboard', icon: IconDashboard },
  {
    title: 'Historial',
    url: '/buy/dashboard/orders',
    icon: IconHistory,
  },
  {
    title: 'Comprar',
    url: '/buy/dashboard/browse-cards',
    icon: IconShoppingCart,
  },
  { title: 'Perfil', url: '/buy/dashboard/profile', icon: IconUser },
];

export const BuyerNavbar = () => {
  return <BottomNav items={navItems} />;
};
