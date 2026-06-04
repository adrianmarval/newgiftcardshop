'use client';

import { Search, Settings, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BrandCountry } from '@/types';

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
  className,
}: CompactSearchBarProps) {
  const countries = (() => {
    const unique = new Map<string, { id: string; name: string; code: string }>();
    for (const bc of brandCountries) {
      if (!unique.has(bc.countryId)) {
        unique.set(bc.countryId, { id: bc.countryId, name: bc.countryName, code: bc.countryCode });
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <div className={cn('bg-card/50 flex items-center gap-1 rounded-xl border p-1 backdrop-blur-sm md:gap-3 md:p-3', className)}>
      {/* Country Selector - Globe hidden on mobile to save space */}
      <div className="flex items-center">
        <Select value={selectedCountry} onValueChange={onCountryChange}>
          <SelectTrigger className="h-8 w-[70px] border-0 bg-transparent p-1 text-xs font-medium focus:ring-0 md:w-[90px] md:text-sm [&>span]:line-clamp-1">
            <SelectValue placeholder="País">
              {selectedCountry &&
                (() => {
                  const country = countries.find((c) => c.id === selectedCountry);
                  return country ? `${COUNTRY_FLAGS[country.code] || ''} ${country.code}` : null;
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
      </div>

      {/* Divider */}
      <div className="bg-border hidden h-5 w-px md:block md:h-6" />

      {/* Amount Input */}
      <div className="relative flex items-center">
        <DollarSign className="text-muted-foreground/50 absolute left-2 h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
        <Input
          type="number"
          placeholder="Monto"
          value={targetAmount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="bg-muted/40 placeholder:text-muted-foreground/50 h-8 w-[80px] border-0 pl-6 text-xs font-medium focus:ring-0 md:h-9 md:w-[100px] md:pl-8 md:text-sm"
        />
      </div>

      {/* Divider */}
      <div className="bg-border hidden h-5 w-px md:block md:h-6" />

      {/* Search + Settings ( grouped together to stay on same line ) */}
      <div className="flex flex-1 items-center gap-1.5">
        {/* Brand Search */}
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search className="text-muted-foreground/50 absolute left-2 h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
          <Input
            placeholder={selectedCountry ? 'Buscar marca...' : 'Selecciona país'}
            value={searchBrand}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={!selectedCountry}
            className="bg-muted/40 placeholder:text-muted-foreground/50 h-8 border-0 pl-6 text-xs focus:ring-0 md:h-9 md:pl-8 md:text-sm"
          />
        </div>

        {/* Advanced Settings Button - inline with search */}
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
