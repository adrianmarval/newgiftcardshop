"use client";

import * as React from "react";
import {
  IconDashboard,
  IconUsers,
  IconShoppingCart,
  IconCreditCard,
  IconChartBar,
  IconCash,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import { Sidebar } from "@/components/ui/sidebar";
import { PortalSidebar } from "./app-sidebar";

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
    <PortalSidebar
      navItems={navItems}
      brandLabel="Solmaira Admin"
      brandHref="/admin/dashboard"
      groupLabel="Management"
      portal="admin"
      logoutVariant="ghost"
      {...props}
    />
  );
}
