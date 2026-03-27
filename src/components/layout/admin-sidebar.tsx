"use client";

import * as React from "react";
import { IconDashboard, IconUsers, IconShoppingCart, IconCreditCard, IconChartBar, IconCash, IconSettings, IconUser } from "@tabler/icons-react";
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
  { title: "Dashboard", url: "/admin/dashboard", icon: IconDashboard },
  { title: "Users", url: "/admin/dashboard/users", icon: IconUsers },
  { title: "All Orders", url: "/admin/dashboard/orders", icon: IconShoppingCart },
  { title: "Gift Cards", url: "/admin/dashboard/cards", icon: IconCreditCard },
  { title: "Analytics", url: "/admin/dashboard/analytics", icon: IconChartBar },
  { title: "Payments", url: "/admin/dashboard/payments", icon: IconCash },
  { title: "Profile", url: "/admin/dashboard/profile", icon: IconUser },
  { title: "Settings", url: "/admin/dashboard/settings", icon: IconSettings },
];

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link className="flex items-center" href="/admin/dashboard">
                <span className="text-3xl font-semibold">Solmaira Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="mt-14">
        <SidebarGroup className="space-y-6">
          <SidebarGroupLabel className="text-4xl">Management</SidebarGroupLabel>
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
          <input type="hidden" name="portal" value="admin" />
          <Button variant="ghost" className="w-full justify-start">
            Sign Out
          </Button>
        </Form>
      </SidebarFooter>
    </Sidebar>
  );
}
