import { SellBatchManager } from '@/components/sell/sell-flow-manager';
import { getActiveBrands } from '@/actions/catalog/get-active-brands';
import { getActiveCountries } from '@/actions/catalog/get-active-countries';
import { getSellerRate } from '@/actions/seller/get-rate';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell Gift Cards | Solmaira Cards',
  description: 'Create a new batch of gift cards to sell on Solmaira',
};

export default async function SellBatchPage() {
  const [brandsResult, countriesResult, sellRateResult] = await Promise.all([getActiveBrands(), getActiveCountries(), getSellerRate()]);

  if (!sellRateResult.data?.success) throw new Error('Failed to get seller rate');
  if (!brandsResult.data?.success) throw new Error('Failed to get brands');
  if (!countriesResult.data?.success) throw new Error('Failed to get countries');

  return (
    <SellBatchManager brands={brandsResult.data.brands} countries={countriesResult.data.countries} sellRate={sellRateResult.data.rate} />
  );
}
