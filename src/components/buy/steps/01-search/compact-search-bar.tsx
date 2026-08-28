'use client';

import { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
// NOTE: Search icon import kept for the hidden brand search row below
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
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
    return Array.from(unique.values()).sort((a, b) => {
      if (a.code === 'US') return -1;
      if (b.code === 'US') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [brandCountries]);

  return (
    <div className={cn('bg-card/50 flex flex-col items-center gap-2 rounded-xl border p-2 backdrop-blur-sm md:gap-3 md:p-4', className)}>
      {/* Country */}
      <div className="flex w-full flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">País</span>
        <div className="bg-muted/40 flex items-center rounded-lg p-1">
          {countries.map((country) => (
            <button
              key={country.id}
              type="button"
              onClick={() => onCountryChange(country.id)}
              className={cn(
                'min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all md:px-3.5 md:py-2 md:text-sm',
                selectedCountry === country.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="mr-1">{COUNTRY_FLAGS[country.code] || ''}</span>
              <span className="hidden sm:inline">{country.name}</span>
              <span className="sm:hidden">{country.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="flex w-full flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Monto</span>
        <div className="relative flex w-full items-center">
          <DollarSign className="text-muted-foreground/50 absolute left-3 h-4 w-4 shrink-0 md:h-5 md:w-5" />
          <Input
            type="number"
            placeholder="Ingresa el monto..."
            value={targetAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            autoFocus={autoFocusAmount}
            aria-invalid={!!amountError}
            className={cn(
              'bg-muted/40 placeholder:text-muted-foreground/50 h-10 w-full border-0 pl-9 text-sm font-medium focus:ring-0 md:h-11 md:pl-11 md:text-base',
              amountError && 'ring-destructive/50 focus:ring-destructive/50 ring-2 focus:ring-2',
            )}
          />
        </div>
        <FieldError message={amountError} className="w-full" />
      </div>

      {showAdvancedButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenAdvanced}
          className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 md:h-10 md:w-10"
        >
          <Settings className="h-4 w-4 md:h-4.5 md:w-4.5" />
          <span className="sr-only">Ajustes avanzados</span>
        </Button>
      )}

      {/*
        Row 3: Brand search — HIDDEN (pocas marcas por ahora).
        Descomentar cuando el catálogo crezca y el filtro sea útil de nuevo.
        Recordar también re-habilitar la prop searchBrand/onSearchChange
        en SearchStep (index.tsx) si se restaura.

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
      </div>
      */}
    </div>
  );
}
