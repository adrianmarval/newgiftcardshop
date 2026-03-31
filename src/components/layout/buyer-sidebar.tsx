"use client";

import * as React from "react";
import { IconDashboard, IconSearch, IconShoppingCart, IconWallet, IconSettings, IconUser } from "@tabler/icons-react";
import { Sidebar } from "@/components/ui/sidebar";
import { PortalSidebar } from "./app-sidebar";

const navItems = [
  { title: "Dashboard", url: "/buy/dashboard", icon: IconDashboard },
  { title: "Browse Cards", url: "/buy/dashboard/browse-cards", icon: IconSearch },
  { title: "My Orders", url: "/buy/dashboard/orders", icon: IconShoppingCart },
  { title: "Wallet", url: "/buy/dashboard/wallet", icon: IconWallet },
  { title: "Profile", url: "/buy/dashboard/profile", icon: IconUser },
  { title: "Settings", url: "/buy/dashboard/settings", icon: IconSettings },
];

export function BuyerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <PortalSidebar
      navItems={navItems}
      brandLabel="Solmaira Buy"
      brandHref="/buy/dashboard"
      portal="buy"
      logoutVariant="destructive"
      {...props}
    />
  );
}
