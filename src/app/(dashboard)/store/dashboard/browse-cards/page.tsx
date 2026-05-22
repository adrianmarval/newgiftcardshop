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
    <div className="w-full space-y-4">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">COMPRAR GIFTCARDS</h1>
      <BuyGiftcardManager brandCountries={brandCountries} resumeOrder={resumeOrder} />
    </div>
  );
}
