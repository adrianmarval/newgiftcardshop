import { SellBatchManager } from '@/components/sell/sell-flow-manager';
import { getActiveBrandCountries } from '@/actions/catalog/get-active-brand-countries';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Sell Gift Cards | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Create a new batch of gift cards to sell on ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function SellBatchPage() {
  const brandCountriesResult = await getActiveBrandCountries();

  if (!brandCountriesResult.data?.success) throw new Error('Failed to get brand countries');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Sell Gift Cards</h1>
      <div className="min-h-0 flex-1">
        <SellBatchManager brandCountries={brandCountriesResult.data.brandCountries} />
      </div>
    </div>
  );
}
