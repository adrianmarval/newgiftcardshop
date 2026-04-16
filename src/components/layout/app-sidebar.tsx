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
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu, ChevronRight } from 'lucide-react';
import { logout } from '@/actions';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';
import { useAction } from 'next-safe-action/hooks';
import type { PortalSidebarProps } from '@/components/ui/types';

function MobileToggle() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="fixed top-4 left-4 z-50 h-10 w-10 md:hidden">
      <Menu className="h-5 w-5" />
      <span className="sr-only">Abrir menú</span>
    </Button>
  );
}

function DesktopToggle() {
  const { open, toggleSidebar, isMobile } = useSidebar();

  if (isMobile || open) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-40 flex h-8 items-center gap-1 px-2 md:flex"
    >
      <ChevronRight className="h-4 w-4 rotate-180" />
      <span className="text-xs">Abrir</span>
    </Button>
  );
}

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
  const { open, toggleSidebar, isMobile } = useSidebar();

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
    <>
      <MobileToggle />
      <DesktopToggle />
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <div className="flex items-center justify-between px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                  <Link className="flex items-center" href={brandHref}>
                    <span className="text-xl font-bold">{brandLabel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            {!isMobile && open && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Cerrar sidebar</span>
              </Button>
            )}
          </div>
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
          <div className="mb-2 flex justify-center">
            <ThemeToggle />
          </div>
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
    </>
  );
}
