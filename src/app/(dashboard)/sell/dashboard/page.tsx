import { getSession } from "@/lib/get-session";
import { IconCreditCard, IconShoppingCart, IconCurrencyDollar, IconClock } from "@tabler/icons-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Dashboard | Solmaira Cards",
  description: "Manage your gift cards and track your sales on Solmaira",
};

export default async function SellerDashboardPage() {
  const session = await getSession();
  const user = session?.user;

  return (
    <div>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="text-muted-foreground">Manage your gift cards and track your sales</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCreditCard className="h-5 w-5" />
            <span className="text-sm font-medium">Active Cards</span>
          </div>
          <span className="text-3xl font-bold">0</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconShoppingCart className="h-5 w-5" />
            <span className="text-sm font-medium">Orders</span>
          </div>
          <span className="text-3xl font-bold">0</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCurrencyDollar className="h-5 w-5" />
            <span className="text-sm font-medium">Earnings</span>
          </div>
          <span className="text-3xl font-bold">$0.00</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconClock className="h-5 w-5" />
            <span className="text-sm font-medium">Pending</span>
          </div>
          <span className="text-3xl font-bold">0</span>
        </div>
      </div>

      <div className="min-h-[400px] flex-1 rounded-xl bg-muted/50 p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-muted-foreground">No recent activity yet.</p>
      </div>
    </div>
  );
}
