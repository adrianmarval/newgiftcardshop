'use client';

import { useMemo } from 'react';
import { Search, Settings, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/ui';
import { FieldError } from '@/components/common';
import type { BrandCountry } from '@/types';

interface CompactSearchBarProps {
  brandCountries: BrandCountry[];
  selectedCountry: string;
  targetAmount: string;
  searchBrand: string;
  onCountryChange: (id: string) => void;
  onAmountChange: (amount: string) => void;
  onSearchChange: (search: string) => void;
  onOpenAdvanced: () => void;
  showAdvancedButton: boolean;
  autoFocusAmount?: boolean;
  amountError?: string | null;
  className?: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  GB: '🇬🇧',
  US: '🇺🇸',
  CA: '🇨🇦',
};

export function CompactSearchBar({
  brandCountries,
  selectedCountry,
  targetAmount,
  searchBrand,
  onCountryChange,
  onAmountChange,
  onSearchChange,
  onOpenAdvanced,
  showAdvancedButton,
  autoFocusAmount,
  amountError,
  className,
}: CompactSearchBarProps) {
  const countries = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; code: string }>();
    for (const bc of brandCountries) {
      if (!unique.has(bc.countryId)) {
        unique.set(bc.countryId, { id: bc.countryId, name: bc.countryName, code: bc.countryCode });
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [brandCountries]);

  return (
    <div className={cn('bg-card/50 flex flex-col items-center gap-1 rounded-xl border p-1 backdrop-blur-sm md:gap-1 md:p-3', className)}>
      {/* Row 1: Country (takes most space) + Amount (small) */}
      <div className="flex w-full items-center gap-1">
        <Select value={selectedCountry} onValueChange={onCountryChange}>
          <SelectTrigger className="h-8 min-w-0 grow border-0 bg-transparent p-1 text-xs font-medium focus:ring-0 md:h-9 md:text-sm [&>span]:line-clamp-1">
            <SelectValue placeholder="Selecciona un país">
              {selectedCountry &&
                (() => {
                  const country = countries.find((c) => c.id === selectedCountry);
                  return country ? `${COUNTRY_FLAGS[country.code] || ''} ${country.name}` : null;
                })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {countries.map((country) => (
              <SelectItem key={country.id} value={country.id}>
                {COUNTRY_FLAGS[country.code] || ''} {country.name} ({country.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex flex-col items-center">
          <div className="relative flex items-center">
            <DollarSign className="text-muted-foreground/50 absolute left-2 h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
            <Input
              type="number"
              placeholder="Monto"
              value={targetAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              autoFocus={autoFocusAmount}
              aria-invalid={!!amountError}
              className={cn(
                'bg-muted/40 placeholder:text-muted-foreground/50 h-8 w-20 shrink-0 border-0 pl-6 text-xs font-medium focus:ring-0 md:h-9 md:w-24 md:pl-8 md:text-sm',
                amountError && 'ring-destructive/50 focus:ring-destructive/50 ring-2 focus:ring-2',
              )}
            />
          </div>
          <FieldError message={amountError} className="w-20 md:w-24" />
        </div>
      </div>

      {/* Row 2: Search (takes most space) + Settings (small) */}
      <div className="flex w-full items-center gap-1">
        <div className="relative flex min-w-0 grow items-center">
          <Search className="text-muted-foreground/50 absolute left-2 h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
          <Input
            placeholder={selectedCountry ? 'Buscar marca...' : 'Primero selecciona un país para buscar marcas'}
            value={searchBrand}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={!selectedCountry}
            className="bg-muted/40 placeholder:text-muted-foreground/50 h-8 min-w-0 border-0 pl-6 text-xs focus:ring-0 md:h-9 md:pl-8 md:text-sm"
          />
        </div>

        {showAdvancedButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenAdvanced}
            className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0 md:h-9 md:w-9"
          >
            <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="sr-only">Ajustes avanzados</span>
          </Button>
        )}
      </div>
    </div>
  );
}
