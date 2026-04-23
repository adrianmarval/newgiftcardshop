'use client';

import { IconDashboard, IconCreditCard, IconUser } from '@tabler/icons-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CircleDollarSign } from 'lucide-react';

const navItems = [
  { title: 'Home', url: '/sell/dashboard', icon: IconDashboard },
  {
    title: 'History',
    url: '/sell/dashboard/cards',
    icon: IconCreditCard,
  },
  {
    title: 'Sell Cards',
    url: '/sell/dashboard/sell-cards',
    icon: CircleDollarSign,
  },
  { title: 'Profile', url: '/sell/dashboard/profile', icon: IconUser },
];

export const SellerNavbar = () => {
  return <BottomNav items={navItems} />;
};
