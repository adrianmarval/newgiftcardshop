import { getSession } from "@/lib/get-session";
import { IconSearch, IconShoppingCart, IconWallet, IconStar } from "@tabler/icons-react";
import { redirect } from "next/navigation";

export default async function BuyerDashboardPage() {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return redirect("/buy/auth/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">Browse and buy discounted gift cards</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconSearch className="h-5 w-5" />
            <span className="text-sm font-medium">Available Cards</span>
          </div>
          <span className="text-3xl font-bold">1,248</span>
        </div>

        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconShoppingCart className="h-5 w-5" />
            <span className="text-sm font-medium">My Orders</span>
          </div>
          <span className="text-3xl font-bold">12</span>
        </div>

        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconWallet className="h-5 w-5" />
            <span className="text-sm font-medium">Balance</span>
          </div>
          <span className="text-3xl font-bold">$420.00</span>
        </div>

        <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconStar className="h-5 w-5" />
            <span className="text-sm font-medium">Saved</span>
          </div>
          <span className="text-3xl font-bold">$125.50</span>
        </div>
      </div>
    </div>
  );
}
