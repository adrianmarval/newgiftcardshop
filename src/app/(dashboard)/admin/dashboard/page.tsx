import { IconUsers, IconCreditCard, IconCurrencyDollar, IconAlertTriangle } from "@tabler/icons-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Solmaira Cards",
  description: "Platform overview, user management, and analytics for Solmaira Cards",
};

export default async function AdminDashboardPage() {
  return (
    <div>
      <div className="space-y-1">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconUsers className="h-5 w-5" />
            <span className="text-base font-medium">Total Users</span>
          </div>
          <span className="text-4xl font-bold">0</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCreditCard className="h-5 w-5" />
            <span className="text-base font-medium">Listed Cards</span>
          </div>
          <span className="text-4xl font-bold">0</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCurrencyDollar className="h-5 w-5" />
            <span className="text-base font-medium">Revenue</span>
          </div>
          <span className="text-4xl font-bold">$0.00</span>
        </div>
      </div>

      <div className="min-h-100 flex-1 rounded-xl bg-muted/50 p-6">
        <h2 className="text-2xl font-semibold mb-4">Platform Activity</h2>
        <p className="text-muted-foreground">No recent activity.</p>
      </div>
    </div>
  );
}
