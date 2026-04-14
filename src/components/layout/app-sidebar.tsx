'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { logout } from '@/actions';
import Link from 'next/link';
import { useAction } from 'next-safe-action/hooks';
import type { PortalSidebarProps } from '@/components/ui/types';

export function PortalSidebar({
  navItems,
  brandLabel,
  brandHref,
  groupLabel = 'Menu',
  portal,
  logoutVariant = 'destructive',
  ...props
}: PortalSidebarProps) {
  const router = useRouter();

  const { execute, status } = useAction(logout, {
    onSuccess: () => {
      router.push(`/${portal}/auth/login`);
      router.refresh();
    },
  });

  const handleLogout = () => {
    execute({ portal: portal as 'buy' | 'sell' | 'admin' });
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link className="flex items-center" href={brandHref}>
                <span className="px-2 text-xl font-bold">{brandLabel}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="mt-4">
        <SidebarGroup className="space-y-4">
          <SidebarGroupLabel className="px-2 text-xs font-bold tracking-wider uppercase">{groupLabel}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-1">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12 cursor-pointer" tooltip={item.title}>
                    <Link href={item.url}>
                      {item.icon && <item.icon size={20} />}
                      <span className="text-lg font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          type="button"
          variant={logoutVariant}
          className="h-12 w-full justify-start rounded-xl px-4 text-xs font-bold tracking-widest uppercase"
          onClick={handleLogout}
          disabled={status === 'executing'}
        >
          {portal === 'buy' || portal === 'admin' ? 'Cerrar Sesión' : 'Sign Out'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
