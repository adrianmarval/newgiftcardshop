'use client';

import { IconDashboard, IconUser, IconHistory, IconShoppingCart, IconSun, IconMoon, IconSettings, IconBell } from '@tabler/icons-react';
import { BottomNav, BottomNavItem } from '@/components/layout/bottom-nav';
import { useTheme } from 'next-themes';

export const BuyerNavbar = ({ isFixed }: { isFixed?: boolean }) => {
  const { theme, setTheme } = useTheme();

  const navItems: BottomNavItem[] = [
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
    {
      title: theme === 'dark' ? 'Luz' : 'Noche',
      icon: theme === 'dark' ? IconSun : IconMoon,
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
    { title: 'Ajustes', url: '/buy/dashboard/settings', icon: IconSettings },
    { title: 'Alertas', url: '/buy/dashboard/notifications', icon: IconBell },
  ];

  return <BottomNav items={navItems} isFixed={isFixed} />;
};
