'use client';

import * as React from 'react';
import { IconDashboard, IconCreditCard, IconUpload, IconShoppingCart, IconWallet, IconUser } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';

const navItems = [
  { title: 'Home', url: '/sell/dashboard', icon: IconDashboard },
  {
    title: 'Cards',
    url: '/sell/dashboard/cards',
    icon: IconCreditCard,
  },
  {
    title: 'Sell',
    url: '/sell/dashboard/sell-cards',
    icon: IconUpload,
  },
  { title: 'Orders', url: '/sell/dashboard/orders', icon: IconShoppingCart },
  { title: 'Wallet', url: '/sell/dashboard/wallet', icon: IconWallet },
  { title: 'Perfil', url: '/sell/dashboard/profile', icon: IconUser },
];

export const SellerSidebar = () => {
  return <BottomNav items={navItems} />;
};
