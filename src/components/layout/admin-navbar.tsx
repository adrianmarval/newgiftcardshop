'use client';

import {
  IconDashboard,
  IconUsers,
  IconShoppingCart,
  IconCreditCard,
  IconCash,
  IconSun,
  IconMoon,
  IconTag,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import { BottomNav, BottomNavItem } from '@/components/layout/bottom-nav';
import { useTheme } from 'next-themes';

export const AdminNavbar = () => {
  const { theme, setTheme } = useTheme();

  const navItems: BottomNavItem[] = [
    { title: 'Home', url: '/admin/dashboard', icon: IconDashboard },
    { title: 'Usuarios', url: '/admin/dashboard/users', icon: IconUsers },
    { title: 'Ordenes', url: '/admin/dashboard/orders', icon: IconShoppingCart },
    {
      title: 'Lotes',
      url: '/admin/dashboard/batches',
      icon: IconCreditCard,
    },
    { title: 'Pagos', url: '/admin/dashboard/payments', icon: IconCash },
    {
      title: 'Brands',
      url: '/admin/dashboard/brands',
      icon: IconTag,
    },
    {
      title: 'Config',
      url: '/admin/dashboard/configuracion',
      icon: IconSettings,
    },
    { title: 'Perfil', url: '/admin/dashboard/profile', icon: IconUser },
    {
      title: theme === 'dark' ? 'Light' : 'Dark',
      icon: theme === 'dark' ? IconSun : IconMoon,
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
  ];

  return <BottomNav items={navItems} />;
};
