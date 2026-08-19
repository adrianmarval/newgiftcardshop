import { BuyGiftcardManager } from '@/components/buy/buy-flow-manager';
import { getActiveBrandCountries } from '@/actions/catalog/get-active-brand-countries';
import { getOrderById } from '@/actions/buyer/orders/get-order-by-id';
import type { BuyerOrder } from '@/types';

export default async function BrowseCardsPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const [brandCountriesResult, params] = await Promise.all([getActiveBrandCountries(), searchParams]);

  if (!brandCountriesResult.data?.success) throw new Error('Ocurrio un error al cargar las marcas');

  const brandCountries = brandCountriesResult.data.brandCountries;

  let resumeOrder: BuyerOrder | null = null;
  if (params.orderId) {
    const result = await getOrderById({ orderId: params.orderId });
    if (result.data?.success && result.data.order) {
      resumeOrder = result.data.order as BuyerOrder;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Browse Gift Cards</h1>
      <div className="min-h-0 flex-1">
        <BuyGiftcardManager brandCountries={brandCountries} resumeOrder={resumeOrder} />
      </div>
    </div>
  );
}
