import { getBuyerOrders } from '@/actions/order/list';
import { BuyerOrdersView } from '@/components/buy/giftcard-orders';
import { orderSearchParamsCache } from '@/lib/search-params-cache';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mis Órdenes | Solmaira Cards',
  description: 'Consulta y rastrea tus órdenes de compra de tarjetas de regalo.',
};

export default async function BuyerOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parsed = orderSearchParamsCache.parse(params);

  const { page, sort } = parsed;
  const status = parsed.status === 'ALL' ? undefined : parsed.status;
  const search = parsed.search || undefined;

  const result = await getBuyerOrders({
    page,
    status: status as 'PENDING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'CANCELLED' | undefined,
    search,
    sort,
  });

  if (!result.data) throw new Error('Ocurrio un error al cargar las ordenes');

  const { items, pagination } = result.data;

  return (
    <div className="container mx-auto space-y-4 py-2">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-7xl">MIS ÓRDENES</h1>
      <BuyerOrdersView orders={items} pagination={pagination} />
    </div>
  );
}
