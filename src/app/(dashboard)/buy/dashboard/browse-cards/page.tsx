import { BuyGiftcardManager } from '@/components/buy/buy-flow-manager';
import { getActiveBrands, getActiveCountries } from '@/actions';
import { getOrderById } from '@/actions/order-actions';
import type { BuyerOrder } from '@/types';

export default async function BrowseCardsPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const [brandsResult, countriesResult, params] = await Promise.all([getActiveBrands(), getActiveCountries(), searchParams]);

  if (!brandsResult.data?.success) throw new Error('Ocurrio un error al cargar las marcas');
  if (!countriesResult.data?.success) throw new Error('Ocurrio un error al cargar los paises');

  const brands = brandsResult.data.brands;
  const countries = countriesResult.data.countries;

  let resumeOrder: BuyerOrder | null = null;
  if (params.orderId) {
    const result = await getOrderById({ orderId: params.orderId });
    if (result.data?.success && result.data.order) {
      resumeOrder = result.data.order as BuyerOrder;
    }
  }

  return <BuyGiftcardManager brands={brands} countries={countries} resumeOrder={resumeOrder} />;
}
