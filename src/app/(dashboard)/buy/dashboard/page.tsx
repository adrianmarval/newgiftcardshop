import { getSession } from "@/lib/authorization";
import { IconSearch, IconShoppingCart, IconWallet, IconStar } from "@tabler/icons-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard de Comprador | Solmaira Cards",
  description: "Explora y compra tarjetas de regalo con descuento en Solmaira",
};

export default async function BuyerDashboardPage() {
  const session = await getSession();

  return (
    <div>
      <div className="space-y-1">
        <h1 className="text-4xl font-bold">Bienvenido{session.user.name ? `, ${session.user.name}` : ""}</h1>
        <p className="text-muted-foreground">Explora y compra tarjetas de regalo con descuento</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconSearch className="h-5 w-5" />
            <span className="text-base font-medium">Tarjetas Disponibles</span>
          </div>
          <span className="text-4xl font-bold">1,248</span>
        </div>

        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconShoppingCart className="h-5 w-5" />
            <span className="text-base font-medium">Mis Órdenes</span>
          </div>
          <span className="text-4xl font-bold">12</span>
        </div>

        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconWallet className="h-5 w-5" />
            <span className="text-base font-medium">Saldo</span>
          </div>
          <span className="text-4xl font-bold">$420.00</span>
        </div>

        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconStar className="h-5 w-5" />
            <span className="text-base font-medium">Ahorrado</span>
          </div>
          <span className="text-4xl font-bold">$125.50</span>
        </div>
      </div>
    </div>
  );
}
