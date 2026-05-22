import { getAllBrands, getAllCountries } from '@/actions/admin/catalog';
import { BrandsManager } from './brands-manager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brands Management | Admin',
};

export default async function BrandsPage() {
  const [brandsResult, countriesResult] = await Promise.all([getAllBrands(), getAllCountries()]);

  if (!brandsResult.data?.success) throw new Error('Failed to load brands');
  if (!countriesResult.data?.success) throw new Error('Failed to load countries');

  return (
    <div className="w-full space-y-4">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">ADMINISTRADOR DE MARCAS</h1>
      <BrandsManager brands={brandsResult.data.brands} countries={countriesResult.data.countries} />
    </div>
  );
}
