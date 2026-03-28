"use client";

import * as React from "react";
import { IconDashboard, IconSearch, IconShoppingCart, IconWallet, IconSettings, IconUser } from "@tabler/icons-react";
import Form from "next/form";

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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions";
import Link from "next/link";

const navItems = [
  { title: "Dashboard", url: "/buy/dashboard", icon: IconDashboard },
  { title: "Browse Cards", url: "/buy/dashboard/browse", icon: IconSearch },
  { title: "My Orders", url: "/buy/dashboard/orders", icon: IconShoppingCart },
  { title: "Wallet", url: "/buy/dashboard/wallet", icon: IconWallet },
  { title: "Profile", url: "/buy/dashboard/profile", icon: IconUser },
  { title: "Settings", url: "/buy/dashboard/settings", icon: IconSettings },
];

export function BuyerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link className="flex items-center" href="/buy/dashboard">
                <span className="text-xl font-bold px-2">Solmaira Buy</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="mt-4">
        <SidebarGroup className="space-y-4">
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider px-2">Menu</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-1">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="cursor-pointer h-12" tooltip={item.title}>
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
        <Form action={logout}>
          <input type="hidden" name="portal" value="buy" />
          <Button variant="ghost" className="w-full justify-start">
            Sign Out
          </Button>
        </Form>
      </SidebarFooter>
    </Sidebar>
  );
}
