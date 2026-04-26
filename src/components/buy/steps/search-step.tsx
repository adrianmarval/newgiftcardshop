'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Check, DollarSign } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { searchGiftcards } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import type { Brand, Country } from '@/types';
import type { SearchStepProps } from '@/components/buy/types';
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
    <div className="grid grid-cols-1 items-start gap-1 md:grid-cols-12 md:gap-6">
      {/* Left Column: Filters */}
      <Card className="border-border bg-card/50 flex flex-col space-y-1.5 px-2 py-2 backdrop-blur-sm md:col-span-4 md:space-y-6 md:p-6">
        <div className="space-y-1">
          {/* País Selector */}
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              1. Selecciona un País
            </Label>
            <div className="w-40 md:w-full">
              <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={searchState.loading}>
                <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-9 w-full text-sm md:h-11 md:text-base">
                  <SelectValue placeholder={searchState.loading ? '...' : 'País'} />
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
          </div>

          {/* Monto Input */}
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              2. Escribe el monto
            </Label>
            <div className="relative w-40 md:w-full">
              <DollarSign className="text-muted-foreground/50 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 md:h-4 md:w-4" />
              <Input
                type="number"
                placeholder="500"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-9 text-sm md:pl-10"
              />
            </div>
          </div>

          {/* Search Brand */}
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              3. Busca o selecciona una marca
            </Label>
            <div className="relative w-40 md:w-full">
              <Search className="text-muted-foreground/50 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 md:h-4 md:w-4" />
              <Input
                placeholder="Search Brand"
                value={searchState.searchBrand}
                onChange={(e) =>
                  setSearchState((prev) => ({
                    ...prev,
                    searchBrand: e.target.value,
                  }))
                }
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-9 text-sm md:pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Right Column: Brand Grid */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col gap-1.5 px-1 py-2 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <CardContent className="custom-scrollbar grid flex-1 grid-cols-3 gap-1 overflow-y-auto px-0 sm:grid-cols-3 md:gap-3 md:px-2 md:pr-2 lg:grid-cols-4">
          {filteredBrands.map((brand, idx) => (
            <motion.button
              key={brand.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => setSelectedBrand(brand.id)}
              className={`group relative flex h-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 pb-1 transition-all md:h-32 ${
                selectedBrand === brand.id
                  ? 'border-primary bg-primary/10 shadow-primary/20 shadow-lg'
                  : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40'
              } `}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative mb-0.5 flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-110 md:mb-2 dark:bg-white">
                {brand.image ? (
                  <Image src={brand.image} alt={brand.name} fill className="rounded-lg object-cover" loading="eager" />
                ) : (
                  <span className="text-xl md:text-5xl">{brand.icon}</span>
                )}
              </div>
              <div className="w-full truncate px-1 text-center text-[11px] font-bold tracking-tight md:text-base">{brand.name}</div>

              {selectedBrand === brand.id && (
                <div className="bg-primary absolute top-1 right-1 rounded-full p-0.5 shadow-lg md:top-2 md:right-2 md:p-1">
                  <Check className="text-primary-foreground h-2 w-2 md:h-3 md:w-3" />
                </div>
              )}
            </motion.button>
          ))}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSearch}
            disabled={!isValid || status === 'executing'}
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-8 w-full text-xs font-bold shadow-lg transition-all md:h-11 md:text-base"
          >
            {searchState.isSearching ? '...' : 'Consultar Disponibilidad'}
            {!searchState.isSearching && <ChevronRight className="ml-1 h-3 w-3 md:ml-2 md:h-4 md:w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
