import { getBuyerOrders } from "@/actions/order-actions";
import { BuyerOrdersView } from "@/components/buy/orders/buyer-orders-view";
import { searchParamsCache } from "@/lib/search-params-cache";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders | Solmaira Cards",
  description: "View and track your gift card purchase orders.",
};

export default async function BuyerOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = searchParamsCache.parse(params);

  const page = parsed.page ?? 1;
  const status = parsed.status === "ALL" ? undefined : parsed.status;
  const search = parsed.search || undefined;
  const sort = parsed.sort ?? "newest";

  const result = await getBuyerOrders({
    page,
    status: status as "PENDING" | "AWAITING_PAYMENT" | "COMPLETED" | "CANCELLED" | undefined,
    search,
    sort,
  });

  if (!result.data) throw new Error("Ocurrio un error al cargar las ordenes");

  const pagination = {
    currentPage: result.data.currentPage,
    totalPages: result.data.totalPages,
    totalCount: result.data.totalCount,
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-5xl font-black italic tracking-tighter">MY ORDERS</h1>
        <p className="text-muted-foreground text-base">Track your purchases and manage pending orders.</p>
      </div>

      <BuyerOrdersView orders={result.data.orders} pagination={pagination} />
    </div>
  );
}
