import { listOrders } from '@/actions/buyer/orders/list-orders';
import { BuyerOrdersView } from '@/components/buy/giftcard-orders';
import { orderSearchParamsCache } from '@/lib/search-params';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Mis Órdenes | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Consulta y rastrea tus órdenes de compra de tarjetas de regalo.',
};

export default async function BuyerOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = orderSearchParamsCache.parse(params);

  const { page, sort } = parsed;
  const status = parsed.status === 'ALL' ? undefined : parsed.status;
  const search = parsed.search || undefined;

  const result = await listOrders({
    page,
    status: status as 'PENDING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'CANCELLED' | undefined,
    search,
    sort,
  });

  if (!result.data) throw new Error('Ocurrio un error al cargar las ordenes');

  const { items, pagination } = result.data;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Mis Órdenes</h1>
      <BuyerOrdersView orders={items} pagination={pagination} search={search} />
    </div>
  );
}
