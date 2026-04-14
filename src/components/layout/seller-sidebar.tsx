'use client';

import * as React from 'react';
import { IconDashboard, IconCreditCard, IconUpload, IconShoppingCart, IconWallet, IconSettings, IconUser } from '@tabler/icons-react';
import { Sidebar } from '@/components/ui/sidebar';
import { PortalSidebar } from './app-sidebar';

const navItems = [
  { title: 'Dashboard', url: '/sell/dashboard', icon: IconDashboard },
  {
    title: 'My Gift Cards',
    url: '/sell/dashboard/cards',
    icon: IconCreditCard,
  },
  {
    title: 'Sell Gift Cards',
    url: '/sell/dashboard/sell-cards',
    icon: IconUpload,
  },
  { title: 'Orders', url: '/sell/dashboard/orders', icon: IconShoppingCart },
  { title: 'Payment Method', url: '/sell/dashboard/payment', icon: IconWallet },
  { title: 'Profile', url: '/sell/dashboard/profile', icon: IconUser },
  { title: 'Settings', url: '/sell/dashboard/settings', icon: IconSettings },
];

export function SellerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <PortalSidebar
      navItems={navItems}
      brandLabel="Solmaira Sell"
      brandHref="/sell/dashboard"
      portal="sell"
      logoutVariant="destructive"
      {...props}
    />
  );
}
