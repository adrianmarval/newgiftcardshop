import { listBrands, listCountries } from '@/actions/admin/catalog';
import { BrandsManager } from '@/components/admin/brands/brands-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brands Management | Admin',
};

export default async function BrandsPage() {
  const [brandsResult, countriesResult] = await Promise.all([listBrands(), listCountries()]);

  if (!brandsResult.data?.success) throw new Error('Failed to load brands');
  if (!countriesResult.data?.success) throw new Error('Failed to load countries');

  return <BrandsManager brands={brandsResult.data.brands} countries={countriesResult.data.countries} />;
}
