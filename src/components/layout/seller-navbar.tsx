'use client';

import { IconDashboard, IconCreditCard, IconUpload, IconUser } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';

const navItems = [
  { title: 'Home', url: '/sell/dashboard', icon: IconDashboard },
  {
    title: 'Card History',
    url: '/sell/dashboard/cards',
    icon: IconCreditCard,
  },
  {
    title: 'Sell Cards',
    url: '/sell/dashboard/sell-cards',
    icon: IconUpload,
  },
  { title: 'Profile', url: '/sell/dashboard/profile', icon: IconUser },
];

export const SellerNavbar = () => {
  return <BottomNav items={navItems} />;
};
