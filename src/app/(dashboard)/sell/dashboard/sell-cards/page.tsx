import { SellBatchManager } from '@/components/sell/sell-batch-manager';
import { getActiveBrands } from '@/actions/brand-actions';
import { getActiveCountries } from '@/actions/country-actions';
import { getSellerRate } from '@/actions/seller-actions';
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
