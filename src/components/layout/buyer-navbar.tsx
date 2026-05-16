'use client';

import { IconDashboard, IconUser, IconHistory, IconShoppingCart, IconSun, IconMoon, IconBell } from '@tabler/icons-react';
import { BottomNav, BottomNavItem } from '@/components/layout/bottom-nav';
import { useTheme } from 'next-themes';

export const BuyerNavbar = () => {
  const { theme, setTheme } = useTheme();

  const navItems: BottomNavItem[] = [
    { title: 'Inicio', url: '/store/dashboard', icon: IconDashboard },
    {
      title: 'Historial',
      url: '/store/dashboard/orders',
      icon: IconHistory,
    },
    {
      title: 'Comprar',
      url: '/store/dashboard/browse-cards',
      icon: IconShoppingCart,
    },
    { title: 'Perfil', url: '/store/dashboard/profile', icon: IconUser },
    { title: 'Alertas', url: '/store/dashboard/notifications', icon: IconBell },
    {
      title: theme === 'dark' ? 'Luz' : 'Noche',
      icon: theme === 'dark' ? IconSun : IconMoon,
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
  ];

  return <BottomNav items={navItems} />;
};
