'use client';

import { IconDashboard, IconCreditCard, IconUser, IconSun, IconMoon, IconCash, IconBell } from '@tabler/icons-react';
import { BottomNav, BottomNavItem } from '@/components/layout/bottom-nav';
import { useTheme } from 'next-themes';

export const SellerNavbar = () => {
  const { theme, setTheme } = useTheme();

  const navItems: BottomNavItem[] = [
    { title: 'Home', url: '/sell/dashboard', icon: IconDashboard },
    {
      title: 'History',
      url: '/sell/dashboard/cards',
      icon: IconCreditCard,
    },
    {
      title: 'Sell Cards',
      url: '/sell/dashboard/sell-cards',
      icon: IconCash,
    },
    { title: 'Profile', url: '/sell/dashboard/profile', icon: IconUser },
    { title: 'Alertas', url: '/buy/dashboard/notifications', icon: IconBell },
    {
      title: theme === 'dark' ? 'Light' : 'Dark',
      icon: theme === 'dark' ? IconSun : IconMoon,
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
  ];

  return <BottomNav items={navItems} />;
};
