'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { useStepHotkeys } from '@/hooks/use-step-hotkeys';
import { cn } from '@/lib/ui';
import type { BrandCountry } from '@/types';
import { SellStepsProgress } from '../shared/sell-steps-progress';
import { BrandCountryGrid, StepFooter, FieldError } from '@/components/common';

export interface BrandStepProps {
  brandCountries: BrandCountry[];
  onBrandSelect: (brandId: string, countryId: string) => void;
  rateError: string | null;
}

export function BrandStep({ brandCountries, onBrandSelect, rateError }: BrandStepProps) {
  const { selectedBrandCountry, setSelectedBrandCountry, setStep } = useSellFlow();

  const [searchBrand, setSearchBrand] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [attempted, setAttempted] = useState(false);

  const countries = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; code: string }>();
    for (const bc of brandCountries) {
      if (!unique.has(bc.countryId)) {
        unique.set(bc.countryId, { id: bc.countryId, name: bc.countryName, code: bc.countryCode });
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [brandCountries]);

  const handleCountryChange = (val: string) => {
    setSelectedCountryId(val);
    setSelectedBrandCountry('', { minAmount: null, maxAmount: null });
  };

  const handleBrandClick = (brandId: string, countryId: string) => {
    const bc = brandCountries.find((b) => b.brandId === brandId && b.countryId === countryId);
    if (bc) {
      setSelectedBrandCountry(`${bc.brandId}|${bc.countryId}`, { minAmount: bc.minAmount, maxAmount: bc.maxAmount });
      onBrandSelect(bc.brandId, bc.countryId);
    }
  };

  const isStep1Valid = selectedBrandCountry !== '' && !rateError;

  // Browser-style validation: el error solo aparece tras intentar continuar,
  // nunca en el mount inicial. Cada campo se marca en SU lugar:
  // - Sin país → el Select de país es el ofensor (el grid todavía no es usable)
  // - Con país pero sin marca → el grid de marcas es el ofensor
  const countryError = !selectedCountryId ? 'Select a country' : null;
  const brandError = selectedCountryId && !selectedBrandCountry ? 'Select a brand' : null;
  const showCountryError = attempted ? countryError : null;
  const showBrandError = attempted ? brandError : null;

  const handleContinue = () => {
    if (!isStep1Valid) {
      setAttempted(true);
      return;
    }
    setStep(2);
  };

  useStepHotkeys({ onContinue: handleContinue, enabled: true });

  return (
    <div className="flex h-full flex-col gap-1">
      <SellStepsProgress />

      <div className="flex min-h-0 flex-1 flex-col gap-1 md:grid md:grid-cols-12">
        <Card className="flex shrink-0 flex-col border p-3 md:col-span-4 md:row-span-11 md:min-h-0 md:p-6">
          <div className="space-y-1 md:flex-1 md:space-y-6 md:overflow-y-auto">
            <div className="flex items-center justify-between gap-1 md:flex-col md:items-start md:justify-start md:gap-1">
              <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
                1. Select Country
              </Label>
              <div className="w-44 md:w-full">
                <Select value={selectedCountryId} onValueChange={handleCountryChange}>
                  <SelectTrigger
                    aria-invalid={!!showCountryError}
                    className={cn(
                      'h-9 w-full',
                      showCountryError && 'border-destructive/50 ring-destructive/30 ring-1',
                    )}
                  >
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
                <FieldError message={showCountryError} className="mt-1" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 md:flex-col md:items-start md:justify-start md:gap-1">
              <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
                2. Select Brand
              </Label>
              <div className="relative w-44 md:w-full">
                <Search className="text-muted-foreground/50 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 md:h-4 md:w-4" />
                <Input
                  placeholder={selectedCountryId ? 'Search Brand' : 'Select country first'}
                  value={searchBrand}
                  onChange={(e) => setSearchBrand(e.target.value)}
                  disabled={!selectedCountryId}
                  className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-9 pl-9 text-sm md:h-8 md:pl-10"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card
          className={cn(
            'flex min-h-0 flex-1 flex-col border py-0 backdrop-blur-sm md:col-span-8 md:row-span-11 md:h-full',
            showBrandError && 'border-destructive/50 ring-destructive/30 ring-1',
          )}
        >
          <CardContent className="custom-scrollbar grid flex-1 auto-rows-max grid-cols-3 gap-1.5 overflow-y-auto p-1.5 sm:grid-cols-3 md:gap-1 md:p-2">
            <BrandCountryGrid
              brandCountries={brandCountries}
              selectedCountryId={selectedCountryId}
              selectedBrandKey={selectedBrandCountry || null}
              searchBrand={searchBrand}
              onSelect={handleBrandClick}
              emptyMessage="Select a country first"
            />
          </CardContent>
          <div className="px-2 pb-1 md:px-2">
            <FieldError message={showBrandError} />
          </div>
        </Card>
      </div>

      {rateError && selectedBrandCountry && (
        <p className="text-destructive text-center text-xs font-medium md:text-sm">{rateError}</p>
      )}

      <StepFooter
        ctaLabel="Continue"
        onContinue={handleContinue}
      />
    </div>
  );
}
