import { BuyGiftcardManager } from '@/components/buy/buy-flow-manager';
import { getActiveBrandCountries } from '@/actions/catalog/get-active-brand-countries';
import { getOrderById } from '@/actions/buyer/orders/get-order-by-id';
import { getLiveAvailability } from '@/actions/buyer/stats';
import type { BuyerOrder } from '@/types';

export default async function BrowseCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; brand?: string; country?: string }>;
}) {
  const [brandCountriesResult, params, availabilityResult] = await Promise.all([
    getActiveBrandCountries(),
    searchParams,
    getLiveAvailability(),
  ]);

  if (!brandCountriesResult.data?.success) throw new Error('Ocurrio un error al cargar las marcas');

  const brandCountries = brandCountriesResult.data.brandCountries;

  // brandCountryId → monto accesible (tier <= buyRate) para el step 1 del wizard
  const accessibility: Record<string, number> = {};
  for (const item of availabilityResult.data?.items ?? []) {
    accessibility[item.brandCountryId] = item.accessibleAmount;
  }

  let resumeOrder: BuyerOrder | null = null;
  if (params.orderId) {
    const result = await getOrderById({ orderId: params.orderId });
    if (result.data?.success && result.data.order) {
      resumeOrder = result.data.order as BuyerOrder;
    }
  }

  // Preselection from the live availability grid (dashboard): only honor the
  // pair if it exists in the catalog — garbage params are ignored.
  const hasValidPreselect =
    !params.orderId &&
    !!params.brand &&
    !!params.country &&
    brandCountries.some((bc) => bc.brandId === params.brand && bc.countryId === params.country);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Browse Gift Cards</h1>
      <div className="min-h-0 flex-1">
        <BuyGiftcardManager
          brandCountries={brandCountries}
          resumeOrder={resumeOrder}
          initialBrandId={hasValidPreselect ? params.brand : undefined}
          initialCountryId={hasValidPreselect ? params.country : undefined}
          accessibility={accessibility}
        />
      </div>
    </div>
  );
}
