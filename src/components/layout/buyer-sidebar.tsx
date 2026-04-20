'use client';

import * as React from 'react';
import { IconDashboard, IconSearch, IconShoppingCart, IconWallet, IconSettings, IconUser, IconHistory } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';

const navItems = [
  { title: 'Inicio', url: '/buy/dashboard', icon: IconDashboard },
  {
    title: 'Comprar',
    url: '/buy/dashboard/browse-cards',
    icon: IconSearch,
  },
  {
    title: 'Historial',
    url: '/buy/dashboard/orders',
    icon: IconHistory,
  },
  { title: 'Perfil', url: '/buy/dashboard/profile', icon: IconUser },
];

export const BuyerSidebar = () => {
  return <BottomNav items={navItems} />;
};
