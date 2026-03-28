import { getSession } from "@/lib/get-session";
import { IconUsers, IconCreditCard, IconCurrencyDollar, IconAlertTriangle } from "@tabler/icons-react";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return redirect("/admin/auth/login");
  }

  return (
    <div>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconUsers className="h-5 w-5" />
            <span className="text-sm font-medium">Total Users</span>
          </div>
          <span className="text-3xl font-bold">0</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCreditCard className="h-5 w-5" />
            <span className="text-sm font-medium">Listed Cards</span>
          </div>
          <span className="text-3xl font-bold">0</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCurrencyDollar className="h-5 w-5" />
            <span className="text-sm font-medium">Revenue</span>
          </div>
          <span className="text-3xl font-bold">$0.00</span>
        </div>

        <div className="rounded-xl bg-muted/50 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconAlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">Disputes</span>
          </div>
          <span className="text-3xl font-bold">0</span>
        </div>
      </div>

      <div className="min-h-[400px] flex-1 rounded-xl bg-muted/50 p-6">
        <h2 className="text-xl font-semibold mb-4">Platform Activity</h2>
        <p className="text-muted-foreground">No recent activity.</p>
      </div>
    </div>
  );
}
