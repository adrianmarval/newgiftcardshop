import { getBuyerOrders } from "@/actions/order-actions";
import { BuyerOrdersView } from "@/components/buy/buyer-orders-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders | Solmaira Cards",
  description: "View and track your gift card purchase orders.",
};

interface SearchParams {
  page?: string;
  status?: string;
  search?: string;
  sort?: string;
}

export default async function BuyerOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const statusParam = params.status;
  const status = statusParam === "ALL" || !statusParam ? undefined : statusParam;
  const search = params.search;
  const sort = (params.sort as "newest" | "oldest") || "newest";

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

  const currentFilters = { status: (status ?? "ALL") as "ALL" | "PENDING" | "AWAITING_PAYMENT" | "COMPLETED" | "CANCELLED", search, sort };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-5xl font-black italic tracking-tighter">MY ORDERS</h1>
        <p className="text-muted-foreground text-base">Track your purchases and manage pending orders.</p>
      </div>

      <BuyerOrdersView orders={result.data.orders} pagination={pagination} currentFilters={currentFilters} />
    </div>
  );
}
