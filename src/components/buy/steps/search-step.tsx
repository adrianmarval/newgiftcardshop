'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Check, DollarSign, Globe, Settings, X, Plus, Filter } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { searchGiftcards } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import type { SearchStepProps } from '@/components/buy/types';
import { toast } from 'sonner';
import { getUserSearchPreferences, updateSearchPreferences } from '@/actions/user/search-preferences';

export function SearchStep({ brandCountries }: SearchStepProps) {
  const { data: session } = useSession();
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

  const [searchBrand, setSearchBrand] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [prefMin, setPrefMin] = useState('');
  const [prefMax, setPrefMax] = useState('');
  const [savedMin, setSavedMin] = useState('');
  const [savedMax, setSavedMax] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      getUserSearchPreferences(session.user.id).then((prefs) => {
        if (prefs) {
          const minStr = prefs.minAmount?.toString() || '';
          const maxStr = prefs.maxAmount?.toString() || '';
          setPrefMin(minStr);
          setPrefMax(maxStr);
          setSavedMin(minStr);
          setSavedMax(maxStr);
        }
      });
    }
  }, [session?.user?.id]);

  const handleClearPreferences = async () => {
    setPrefMin('');
    setPrefMax('');
    setSavedMin('');
    setSavedMax('');

    if (session?.user?.id) {
      await updateSearchPreferences({
        minAmount: null,
        maxAmount: null,
      });
    }
  };

  const handleSavePreferences = async () => {
    if (!session?.user?.id) return;

    const minVal = prefMin ? parseFloat(prefMin) : null;
    const maxVal = prefMax ? parseFloat(prefMax) : null;

    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      toast.error('El monto mínimo no puede ser mayor al máximo');
      return;
    }

    const result = await updateSearchPreferences({
      minAmount: minVal,
      maxAmount: maxVal,
    });

    if (result.serverError) {
      toast.error('Error al guardar preferencias');
    } else {
      toast.success('Preferencias guardadas');
      setSavedMin(prefMin);
      setSavedMax(prefMax);
      setPreferencesOpen(false);
    }
  };

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
    if (!selectedCountry) return [];
    return brandCountries
      .filter((bc) => bc.countryId === selectedCountry)
      .filter((bc) => {
        if (!searchBrand) return true;
        const search = searchBrand.toLowerCase();
        return bc.brandName.toLowerCase().includes(search) || bc.brandSlug.toLowerCase().includes(search);
      });
  }, [brandCountries, selectedCountry, searchBrand]);

  const { execute, status } = useAction(searchGiftcards, {
    onSuccess: ({ data }) => {
      if (data?.success && data.giftcards && data.giftcards.length > 0) {
        setFoundGiftcards(data.giftcards);
        setStep(2);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.warning('No se encontraron tarjetas disponibles');
      }
      setIsSearching(false);
    },
    onError: ({ error }) => {
      toast.error('Error al buscar las tarjetas', {
        description: error.serverError || error.validationErrors?._errors?.[0] || 'Ocurrio un error al buscar las tarjetas',
      });
      setIsSearching(false);
    },
  });

  const handleSearch = () => {
    if (!selectedBrand || !targetAmount) return;

    setIsSearching(true);
    const amount = parseFloat(targetAmount);
    const [brandId, countryId] = selectedBrand.split('|');
    execute({ brandId, countryId, amount });
  };

  const handleCountryChange = (val: string) => {
    setSelectedCountry(val);
    setSelectedBrand('');
  };

  const handleBrandSelect = (bc: { brandId: string; countryId: string }) => {
    setSelectedBrand(`${bc.brandId}|${bc.countryId}`);
  };

  const isValid = selectedBrand && targetAmount && parseFloat(targetAmount) > 0;
  const showEmptyState = !selectedCountry;

  return (
    <div className="grid grid-cols-1 items-start gap-1 md:grid-cols-12 md:gap-6">
      {/* Left Column: Filters */}
      <Card className="border-border bg-card/50 flex flex-col space-y-1.5 px-2 py-2 backdrop-blur-sm md:col-span-4 md:space-y-6 md:p-6">
        <div className="space-y-1">
          {/* Header + Preferences Popover */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Configuración</span>
            <Popover open={preferencesOpen} onOpenChange={setPreferencesOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-50" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Preferencias de Búsqueda</div>
                    <Button variant="ghost" size="sm" onClick={handleClearPreferences} className="text-muted-foreground h-6 text-xs">
                      Limpiar
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Min. Denominacion</Label>
                      <Input type="number" placeholder="25" value={prefMin} onChange={(e) => setPrefMin(e.target.value)} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Max. Denominacion</Label>
                      <Input type="number" placeholder="500" value={prefMax} onChange={(e) => setPrefMax(e.target.value)} className="h-8" />
                    </div>
                  </div>
                  <Button onClick={handleSavePreferences} className="w-full" size="sm">
                    Guardar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters Indicator */}
          {(savedMin || savedMax) && (
            <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2">
              <Filter className="text-muted-foreground h-3.5 w-3.5" />
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {savedMin && (
                  <span className="text-muted-foreground">
                    Min Denominacion: <span className="text-foreground font-medium">${savedMin}</span>
                  </span>
                )}
                {/* {savedMin && savedMax && <span className="text-muted-foreground">|</span>} */}
                {savedMax && (
                  <span className="text-muted-foreground">
                    Max Denominacion: <span className="text-foreground font-medium">${savedMax}</span>
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground ml-auto h-5 w-5"
                onClick={() => {
                  handleClearPreferences();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* País Selector */}
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              1. Selecciona un País
            </Label>
            <div className="w-40 md:w-full">
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-9 w-full text-sm md:h-11 md:text-base">
                  <SelectValue placeholder="País" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {countries.map((country) => (
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
                placeholder={selectedCountry ? 'Buscar marca' : 'Selecciona país primero'}
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                disabled={!selectedCountry}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-9 text-sm md:pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Right Column: Brand Grid */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col gap-1.5 px-1 py-2 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <CardContent className="custom-scrollbar grid flex-1 grid-cols-3 gap-1 overflow-y-auto px-0 sm:grid-cols-3 md:gap-3 md:px-2 md:pr-2 lg:grid-cols-4">
          {showEmptyState ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Globe className="text-muted-foreground/30 mb-4 h-16 w-16" />
              <h3 className="text-foreground mb-2 text-lg font-semibold">Selecciona un país primero</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                Elige un país del dropdown para ver las marcas disponibles en esa región.
              </p>
            </div>
          ) : (
            filteredBrandCountries.map((bc, idx) => (
              <motion.button
                key={`${bc.brandId}_${bc.countryId}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => handleBrandSelect({ brandId: bc.brandId, countryId: bc.countryId })}
                className={`group relative flex h-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 pb-1 transition-all md:h-32 ${
                  selectedBrand === `${bc.brandId}|${bc.countryId}`
                    ? 'border-primary bg-primary/10 shadow-primary/20 shadow-lg'
                    : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40'
                } `}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative mb-0.5 flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-110 md:mb-2 dark:bg-white">
                  {bc.brandImage ? (
                    <Image src={bc.brandImage} alt={bc.brandName} fill className="rounded-lg object-cover" loading="eager" />
                  ) : (
                    <span className="text-xl md:text-5xl">{bc.brandIcon}</span>
                  )}
                </div>
                <div className="w-full truncate px-1 text-center text-[11px] font-bold tracking-tight md:text-base">{bc.brandName}</div>
                <div className="text-muted-foreground text-[9px] md:text-xs">{bc.countryCode}</div>

                {selectedBrand === `${bc.brandId}|${bc.countryId}` && (
                  <div className="bg-primary absolute top-1 right-1 rounded-full p-0.5 shadow-lg md:top-2 md:right-2 md:p-1">
                    <Check className="text-primary-foreground h-2 w-2 md:h-3 md:w-3" />
                  </div>
                )}
              </motion.button>
            ))
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSearch}
            disabled={!isValid || status === 'executing'}
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-8 w-full text-xs font-bold shadow-lg transition-all md:h-11 md:text-base"
          >
            {isSearching ? '...' : 'Consultar Disponibilidad'}
            {!isSearching && <ChevronRight className="ml-1 h-3 w-3 md:ml-2 md:h-4 md:w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
