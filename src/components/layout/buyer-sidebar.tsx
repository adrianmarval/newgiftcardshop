"use client";

import * as React from "react";
import { IconDashboard, IconSearch, IconShoppingCart, IconWallet, IconSettings, IconUser } from "@tabler/icons-react";
import { Sidebar } from "@/components/ui/sidebar";
import { PortalSidebar } from "./app-sidebar";

const navItems = [
  { title: "Panel Control", url: "/buy/dashboard", icon: IconDashboard },
  { title: "Explorar Tarjetas", url: "/buy/dashboard/browse-cards", icon: IconSearch },
  { title: "Mis Órdenes", url: "/buy/dashboard/orders", icon: IconShoppingCart },
  { title: "Billetera", url: "/buy/dashboard/wallet", icon: IconWallet },
  { title: "Perfil", url: "/buy/dashboard/profile", icon: IconUser },
  { title: "Ajustes", url: "/buy/dashboard/settings", icon: IconSettings },
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
