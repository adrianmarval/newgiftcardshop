'use client';

import {
  IconDashboard,
  IconUsers,
  IconShoppingCart,
  IconCreditCard,
  IconChartBar,
  IconCash,
  IconSun,
  IconMoon,
  IconTag,
  IconBell,
  IconSettings,
} from '@tabler/icons-react';
import { BottomNav, BottomNavItem } from '@/components/layout/bottom-nav';
import { useTheme } from 'next-themes';
// import { useLogout } from '@/hooks/use-logout';

export const AdminNavbar = ({ isFixed }: { isFixed?: boolean }) => {
  const { theme, setTheme } = useTheme();
  // const { handleLogout } = useLogout('admin');

  const navItems: BottomNavItem[] = [
    { title: 'Home', url: '/admin/dashboard', icon: IconDashboard },
    { title: 'Usuarios', url: '/admin/dashboard/users', icon: IconUsers },
    { title: 'Ordenes', url: '/admin/dashboard/orders', icon: IconShoppingCart },
    {
      title: 'Lotes',
      url: '/admin/dashboard/batches',
      icon: IconCreditCard,
    },
    { title: 'Alertas', url: '/buy/dashboard/notifications', icon: IconBell },
    { title: 'Pagos', url: '/admin/dashboard/payments', icon: IconCash },
    {
      title: 'Brands',
      url: '/admin/dashboard/brands',
      icon: IconTag,
    },
    {
      title: 'Analiticas',
      url: '/admin/dashboard/analytics',
      icon: IconChartBar,
    },
    {
      title: 'Config',
      url: '/admin/dashboard/configuracion',
      icon: IconSettings,
    },
    {
      title: theme === 'dark' ? 'Light' : 'Dark',
      icon: theme === 'dark' ? IconSun : IconMoon,
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
    // {
    //   title: 'Salir',
    //   icon: IconLogout,
    //   onClick: handleLogout,
    // },
  ];

  return <BottomNav items={navItems} variant="compact" isFixed={isFixed} />;
};
