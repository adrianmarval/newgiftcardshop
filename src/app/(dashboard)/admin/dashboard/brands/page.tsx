import { getAllBrands, getAllCountries } from '@/actions/admin/brands';
import { BrandsManager } from './brands-manager';

export const metadata = {
  title: 'Brands Management | Admin',
};

export default async function BrandsPage() {
  const [brandsResult, countriesResult] = await Promise.all([getAllBrands(), getAllCountries()]);

  if (!brandsResult.data?.success) throw new Error('Failed to load brands');
  if (!countriesResult.data?.success) throw new Error('Failed to load countries');

  return <BrandsManager brands={brandsResult.data.brands} countries={countriesResult.data.countries} />;
}
