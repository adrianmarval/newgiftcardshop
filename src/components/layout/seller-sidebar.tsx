"use client";

import * as React from "react";
import { IconDashboard, IconCreditCard, IconUpload, IconShoppingCart, IconWallet, IconSettings, IconUser } from "@tabler/icons-react";
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
  { title: "Dashboard", url: "/sell/dashboard", icon: IconDashboard },
  { title: "My Gift Cards", url: "/sell/dashboard/cards", icon: IconCreditCard },
  { title: "Upload Cards", url: "/sell/dashboard/upload", icon: IconUpload },
  { title: "Orders", url: "/sell/dashboard/orders", icon: IconShoppingCart },
  { title: "Payment Method", url: "/sell/dashboard/payment", icon: IconWallet },
  { title: "Profile", url: "/sell/dashboard/profile", icon: IconUser },
  { title: "Settings", url: "/sell/dashboard/settings", icon: IconSettings },
];

export function SellerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link className="flex items-center" href="/sell/dashboard">
                <span className="text-3xl font-semibold">Solmaira Sell</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="mt-14">
        <SidebarGroup className="space-y-6">
          <SidebarGroupLabel className="text-4xl">Menu</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title} className="h-16">
                  <SidebarMenuButton asChild className="cursor-pointer h-full" tooltip={item.title}>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span className="text-3xl">{item.title}</span>
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
          <input type="hidden" name="portal" value="sell" />
          <Button variant="ghost" className="w-full justify-start">
            Sign Out
          </Button>
        </Form>
      </SidebarFooter>
    </Sidebar>
  );
}
