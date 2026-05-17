import { SellBatchManager } from '@/components/sell/sell-flow-manager';
import { getActiveBrandCountries } from '@/actions/catalog/brand-country';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Sell Gift Cards | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Create a new batch of gift cards to sell on ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function SellBatchPage() {
  const brandCountriesResult = await getActiveBrandCountries();

  if (!brandCountriesResult.data?.success) throw new Error('Failed to get brand countries');

  return <SellBatchManager brandCountries={brandCountriesResult.data.brandCountries} />;
}
