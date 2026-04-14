'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { searchGiftcards } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import type { SearchStepProps, Brand, Country } from '@/types';
import { toast } from 'sonner';

export function SearchStep({ brands, countries }: SearchStepProps) {
  const {
    selectedBrand,
    setSelectedBrand,
    selectedCountry,
    setSelectedCountry,
    targetAmount,
    setTargetAmount,
    setStep,
    setFoundGiftcards,
  } = useBuyFlow();

  const [searchState, setSearchState] = useState<{
    brand: Brand[];
    country: Country[];
    loading: boolean;
    searchBrand: string;
    isSearching: boolean;
  }>({
    brand: brands,
    country: countries,
    loading: false,
    searchBrand: '',
    isSearching: false,
  });

  const filteredBrands = searchState.brand.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchState.searchBrand.toLowerCase()) ||
      brand.slug.toLowerCase().includes(searchState.searchBrand.toLowerCase()),
  );

  const { execute, status } = useAction(searchGiftcards, {
    onSuccess: ({ data }) => {
      if (data?.success && data.giftcards) {
        setFoundGiftcards(data.giftcards);
        setStep(2);
      }
      setSearchState((prev) => ({ ...prev, isSearching: false }));
    },
    onError: ({ error }) => {
      toast.error('Error al buscar las tarjetas', {
        description: error.serverError || error.validationErrors?._errors?.[0] || 'Ocurrio un error al buscar las tarjetas',
      });
      setSearchState((prev) => ({ ...prev, isSearching: false }));
    },
  });

  const handleSearch = () => {
    if (!selectedBrand || !targetAmount) return;

    setSearchState((prev) => ({ ...prev, isSearching: true }));
    const amount = parseFloat(targetAmount);
    execute({ brandId: selectedBrand, countryId: selectedCountry, amount });
  };

  const isValid = selectedBrand && selectedCountry && targetAmount && parseFloat(targetAmount) > 0;

  return (
    <div className="grid h-full grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Left Column: Filters */}
      <Card className="border-border bg-card/50 sticky top-0 z-20 flex h-auto flex-col space-y-4 p-3 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <h2 className="mb-1 text-xl font-bold md:mb-2 md:text-2xl">Configuración</h2>
          <p className="text-muted-foreground text-sm md:text-base">¿Qué estás buscando?</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wider uppercase md:text-sm">País</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={searchState.loading}>
              <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 text-base md:h-11">
                <SelectValue placeholder={searchState.loading ? 'Cargando...' : 'Seleccionar país...'} />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground">
                {searchState.country.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wider uppercase md:text-sm">
              Monto Total Objetivo
            </Label>
            <div className="relative">
              <span className="text-muted-foreground/50 absolute top-2.5 left-3 text-base md:top-3">$</span>
              <Input
                type="number"
                placeholder="Ej: 500"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 pl-7 text-base md:h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wider uppercase md:text-sm">
              Buscar Marca
            </Label>
            <div className="relative">
              <Search className="text-muted-foreground/50 absolute top-2.5 left-3 h-3.5 w-3.5 md:top-3 md:h-4 md:w-4" />
              <Input
                placeholder="Buscar..."
                value={searchState.searchBrand}
                onChange={(e) =>
                  setSearchState((prev) => ({
                    ...prev,
                    searchBrand: e.target.value,
                  }))
                }
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 pl-9 text-base md:h-11 md:pl-10"
              />
            </div>
          </div>
        </div>

        <div className="border-border mt-auto flex flex-col gap-2 border-t pt-4 md:gap-3 md:pt-6">
          <Button
            onClick={handleSearch}
            disabled={!isValid || status === 'executing'}
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-10 w-full text-base font-bold shadow-lg transition-all md:h-11"
          >
            {searchState.isSearching ? 'Buscando Tarjetas...' : 'Consultar Disponibilidad'}
            {!searchState.isSearching && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </Card>

      {/* Right Column: Brand Grid */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-3 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm">Marcas Disponibles</Label>
          <span className="text-muted-foreground/50 text-xs">{filteredBrands.length} ítems</span>
        </div>

        <div className="custom-scrollbar grid max-h-125 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:max-h-150 md:gap-3 md:pr-2 lg:grid-cols-4">
          {filteredBrands.map((brand, idx) => (
            <motion.button
              key={brand.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => setSelectedBrand(brand.id)}
              className={`group relative flex h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 pb-2 transition-all md:h-32 ${
                selectedBrand === brand.id
                  ? 'border-primary bg-primary/10 shadow-primary/20 shadow-lg'
                  : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40'
              } `}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative mb-1 flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-110 md:mb-2 dark:bg-white">
                {brand.image ? (
                  <Image src={brand.image} alt={brand.name} fill className="rounded-lg object-cover" loading="eager" />
                ) : (
                  <span className="text-2xl md:text-5xl">{brand.icon}</span>
                )}
              </div>
              <div className="w-full truncate px-1 text-center text-sm font-bold tracking-tight md:text-base">{brand.name}</div>

              {selectedBrand === brand.id && (
                <div className="bg-primary absolute top-1 right-1 rounded-full p-0.5 shadow-lg md:top-2 md:right-2 md:p-1">
                  <Check className="text-primary-foreground h-2 w-2 md:h-3 md:w-3" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </Card>
    </div>
  );
}
