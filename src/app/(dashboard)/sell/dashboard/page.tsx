import { getSession } from '@/lib/authorization';
import { IconCreditCard, IconShoppingCart, IconCurrencyDollar, IconClock } from '@tabler/icons-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seller Dashboard | Solmaira Cards',
  description: 'Manage your gift cards and track your sales on Solmaira',
};

export default async function SellerDashboardPage() {
  const session = await getSession();

  return (
    <div>
      <div className="space-y-1">
        <h1 className="text-4xl font-bold">Welcome back{session.user.name ? `, ${session.user.name}` : ''}</h1>
        <p className="text-muted-foreground">Manage your gift cards and track your sales</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconCreditCard className="h-5 w-5" />
            <span className="text-base font-medium">Active Cards</span>
          </div>
          <span className="text-4xl font-bold">0</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconShoppingCart className="h-5 w-5" />
            <span className="text-base font-medium">Orders</span>
          </div>
          <span className="text-4xl font-bold">0</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconCurrencyDollar className="h-5 w-5" />
            <span className="text-base font-medium">Earnings</span>
          </div>
          <span className="text-4xl font-bold">$0.00</span>
        </div>

        <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-6">
          <div className="text-muted-foreground flex items-center gap-2">
            <IconClock className="h-5 w-5" />
            <span className="text-base font-medium">Pending</span>
          </div>
          <span className="text-4xl font-bold">0</span>
        </div>
      </div>

      <div className="bg-muted/50 min-h-100 flex-1 rounded-xl p-6">
        <h2 className="mb-4 text-2xl font-semibold">Recent Activity</h2>
        <p className="text-muted-foreground">No recent activity yet.</p>
      </div>
    </div>
  );
}
