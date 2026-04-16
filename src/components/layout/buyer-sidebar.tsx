'use client';

import * as React from 'react';
import { IconDashboard, IconSearch, IconShoppingCart, IconWallet, IconSettings, IconUser } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';

const navItems = [
  { title: 'Home', url: '/buy/dashboard', icon: IconDashboard },
  {
    title: 'Buscar',
    url: '/buy/dashboard/browse-cards',
    icon: IconSearch,
  },
  {
    title: 'Orders',
    url: '/buy/dashboard/orders',
    icon: IconShoppingCart,
  },
  { title: 'Wallet', url: '/buy/dashboard/wallet', icon: IconWallet },
  { title: 'Perfil', url: '/buy/dashboard/profile', icon: IconUser },
];

export const BuyerSidebar = () => {
  return <BottomNav items={navItems} />;
};
