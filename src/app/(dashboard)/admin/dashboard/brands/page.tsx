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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Brands</h1>
      <BrandsManager brands={brandsResult.data.brands} countries={countriesResult.data.countries} />
    </div>
  );
}
