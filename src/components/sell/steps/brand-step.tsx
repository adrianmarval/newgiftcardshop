'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSellFlow } from '@/hooks/use-sell-flow';
import Image from 'next/image';
import { BrandCountry } from '@/types';

export interface BrandStepProps {
  brandCountries: BrandCountry[];
  onBrandSelect: (brandId: string, countryId: string) => void;
}

export function BrandStep({ brandCountries, onBrandSelect }: BrandStepProps) {
  const { selectedBrandCountry, setSelectedBrandCountry, setStep } = useSellFlow();

  const [searchBrand, setSearchBrand] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState('');

  const countries = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; code: string }>();
    for (const bc of brandCountries) {
      if (!unique.has(bc.countryId)) {
        unique.set(bc.countryId, { id: bc.countryId, name: bc.countryName, code: bc.countryCode });
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [brandCountries]);

  const filteredBrandCountries = useMemo(() => {
    if (!selectedCountryId) return [];
    return brandCountries
      .filter((bc) => bc.countryId === selectedCountryId)
      .filter((bc) => {
        if (!searchBrand) return true;
        const search = searchBrand.toLowerCase();
        return bc.brandName.toLowerCase().includes(search) || bc.brandSlug.toLowerCase().includes(search);
      });
  }, [brandCountries, selectedCountryId, searchBrand]);

  const handleCountryChange = (val: string) => {
    setSelectedCountryId(val);
    setSelectedBrandCountry('', { minAmount: null, maxAmount: null });
  };

  const handleBrandClick = (bc: BrandCountry) => {
    setSelectedBrandCountry(`${bc.brandId}|${bc.countryId}`, { minAmount: bc.minAmount, maxAmount: bc.maxAmount });
    onBrandSelect(bc.brandId, bc.countryId);
  };

  const isStep1Valid = selectedBrandCountry !== '';
  const showEmptyState = !selectedCountryId;

  return (
    <div className="grid grid-cols-1 items-start gap-1 md:grid-cols-12 md:gap-6">
      <Card className="flex flex-col border md:col-span-4 md:space-y-6 md:p-6">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              1. Select Country
            </Label>
            <div className="w-40 md:w-full">
              <Select value={selectedCountryId} onValueChange={handleCountryChange}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              2. Select Brand
            </Label>
            <div className="relative w-40 md:w-full">
              <Search className="text-muted-foreground/50 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 md:h-4 md:w-4" />
              <Input
                placeholder={selectedCountryId ? 'Search Brand' : 'Select country first'}
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                disabled={!selectedCountryId}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-9 text-sm md:pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card/50 flex min-h-100 flex-col gap-1.5 border px-1 py-2 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <CardContent className="custom-scrollbar grid flex-1 grid-cols-3 gap-1 overflow-y-auto px-0 sm:grid-cols-3 md:gap-3 md:px-2 md:pr-2 lg:grid-cols-4">
          {showEmptyState ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Globe className="text-muted-foreground/30 mb-4 h-16 w-16" />
              <h3 className="text-foreground mb-2 text-lg font-semibold">Select a country first</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                Choose a country from the dropdown to see available brands in that region.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredBrandCountries.map((bc) => (
                <motion.button
                  key={`${bc.brandId}_${bc.countryId}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  disabled={!bc.isActive}
                  onClick={() => handleBrandClick(bc)}
                  className={`group relative flex h-20 flex-col items-center justify-center overflow-hidden rounded-xl border-2 pb-1 transition-all md:h-32 ${
                    !bc.isActive
                      ? 'border-border bg-muted/10 cursor-not-allowed opacity-80'
                      : selectedBrandCountry === `${bc.brandId}|${bc.countryId}`
                        ? 'border-primary bg-primary/10 shadow-primary/20 cursor-pointer shadow-lg'
                        : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40 cursor-pointer'
                  } `}
                  whileHover={bc.isActive ? { scale: 1.02, y: -2 } : {}}
                  whileTap={bc.isActive ? { scale: 0.98 } : {}}
                >
                  <div
                    className={`relative mb-0.5 flex h-full w-full items-center justify-center transition-transform duration-300 ${bc.isActive ? 'group-hover:scale-110' : 'opacity-40 grayscale'} dark:bg-white`}
                  >
                    {bc.brandImage ? (
                      <Image src={bc.brandImage} alt={bc.brandName} fill className="rounded-lg object-contain" loading="eager" />
                    ) : (
                      <span className="text-xl md:text-5xl">{bc.brandIcon}</span>
                    )}
                  </div>
                  <div
                    className={`w-full truncate px-1 text-center text-[11px] font-bold tracking-tight md:text-base ${!bc.isActive ? 'text-muted-foreground' : ''}`}
                  >
                    {bc.brandName}
                  </div>

                  {!bc.isActive && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
                      <div className="w-[300%] -rotate-45 border-y border-white/10 bg-black/60 py-2 text-center text-[9px] font-black tracking-[0.4em] whitespace-nowrap text-white uppercase shadow-2xl backdrop-blur-md md:py-3 md:text-[14px]">
                        Coming Soon
                      </div>
                    </div>
                  )}

                  {selectedBrandCountry === `${bc.brandId}|${bc.countryId}` && bc.isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-primary absolute top-1 right-1 rounded-full p-0.5 shadow-lg md:top-2 md:right-2 md:p-1"
                    >
                      <Check className="text-primary-foreground h-2 w-2 md:h-3 md:w-3" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </CardContent>
        <div>
          <Button onClick={() => setStep(2)} disabled={!isStep1Valid} className="p-4">
            Continuar <ChevronRight className="ml-1 h-4 w-4 md:ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
