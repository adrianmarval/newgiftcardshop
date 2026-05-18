'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Check, DollarSign, Globe, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { searchGiftcards } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import type { SearchStepProps } from '@/components/buy/types';
import { getUserSearchPreferences, updateSearchPreferences, updateBuyRate } from '@/actions/user/search-preferences';
import { getUserBuyRate } from '@/actions/order/get-user-buy-rate';
import { showAlert } from '@/lib/swal';
import type { SearchGiftcardItem, TierInfo } from '@/types/application/buy-flow';

export function SearchStep({ brandCountries }: SearchStepProps) {
  const { data: session } = useSession();
  const {
    selectedBrand,
    setSelectedBrand,
    selectedCountry,
    setSelectedCountry,
    selectedCurrency,
    setSelectedCurrency,
    targetAmount,
    setTargetAmount,
    setStep,
    setFoundGiftcards,
    setTierInfo,
  } = useBuyFlow();

  const [searchBrand, setSearchBrand] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [prefMin, setPrefMin] = useState('');
  const [prefMax, setPrefMax] = useState('');
  const [savedMin, setSavedMin] = useState('');
  const [savedMax, setSavedMax] = useState('');
  const [allowSearchPreferences, setAllowSearchPreferences] = useState(false);
  const [allowBuyRateAdjustment, setAllowBuyRateAdjustment] = useState(false);
  const [prefBuyRate, setPrefBuyRate] = useState('');
  const [savedBuyRate, setSavedBuyRate] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const selectedBc = useMemo(() => {
    if (!selectedBrand) return null;
    const [bId, cId] = selectedBrand.split('|');
    return brandCountries.find((bc) => bc.brandId === bId && bc.countryId === cId) || null;
  }, [selectedBrand, brandCountries]);

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
          setAllowSearchPreferences(prefs.allowSearchPreferences || false);
          setAllowBuyRateAdjustment(prefs.allowBuyRateAdjustment || false);
        }
      });
    }
  }, [session?.user?.id]);

  const selectedBcId = selectedBc?.id;

  // Cargar tarifa cuando se selecciona marca y país
  useEffect(() => {
    if (allowBuyRateAdjustment && selectedBcId) {
      getUserBuyRate({ brandCountryId: selectedBcId }).then((res) => {
        if (res?.data?.success && res.data.rate) {
          const brStr = (res.data.rate * 100).toString();
          setPrefBuyRate(brStr);
          setSavedBuyRate(brStr);
        }
      });
    } else {
      setPrefBuyRate('');
      setSavedBuyRate('');
    }
  }, [selectedBcId, allowBuyRateAdjustment]);

  // Guardar currency cuando se selecciona un brandCountry
  useEffect(() => {
    if (selectedBc?.countryCurrency) {
      setSelectedCurrency(selectedBc.countryCurrency);
    } else {
      setSelectedCurrency('USD');
    }
  }, [selectedBc, setSelectedCurrency]);

  const handleClearPreferences = async () => {
    setPrefMin('');
    setPrefMax('');
    setSavedMin('');
    setSavedMax('');

    if (session?.user?.id) {
      const result = await updateSearchPreferences({
        minAmount: null,
        maxAmount: null,
      });

      if (result?.serverError) {
        showAlert.toast.error('Error al limpiar filtros');
      } else {
        showAlert.toast.success('Filtros limpiados correctamente');
      }
    }
  };

  const handleSavePreferences = async () => {
    if (!session?.user?.id) return;

    const minVal = prefMin ? parseFloat(prefMin) : null;
    const maxVal = prefMax ? parseFloat(prefMax) : null;

    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      showAlert.toast.error('El monto mínimo no puede ser mayor al máximo');
      return;
    }

    const result = await updateSearchPreferences({
      minAmount: minVal,
      maxAmount: maxVal,
    });

    if (result.serverError) {
      showAlert.toast.error('Error al guardar preferencias');
    } else {
      let brUpdated = true;
      if (allowBuyRateAdjustment && prefBuyRate) {
        const brVal = parseFloat(prefBuyRate) / 100;
        if (brVal < 0.8) {
          showAlert.toast.error('La tarifa de compra no puede ser inferior a 80%');
          return;
        }
        if (!selectedBc) {
          showAlert.toast.error('Selecciona un brand y país para ajustar tu tarifa');
          return;
        }
        const brResult = await updateBuyRate({ brandCountryId: selectedBc.id, buyRate: brVal });
        if (brResult?.data?.error) {
          showAlert.toast.error(brResult.data.error);
          brUpdated = false;
        } else if (brResult?.serverError) {
          showAlert.toast.error('Error al actualizar tarifa');
          brUpdated = false;
        } else {
          setSavedBuyRate(prefBuyRate);
        }
      }

      if (brUpdated) {
        showAlert.toast.success('Ajustes guardados correctamente');
        setSavedMin(prefMin);
        setSavedMax(prefMax);
      }
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
    onSuccess: (result) => {
      const data = result;
      if (!data?.data) return;
      const { success, giftcards, error, tierInfo } = data.data;
      if (success && giftcards && giftcards.length > 0) {
        setFoundGiftcards(giftcards as SearchGiftcardItem[]);
        if (tierInfo) {
          setTierInfo(tierInfo as TierInfo);
        }
        setStep(2);
      } else if (error) {
        if (tierInfo) {
          setTierInfo(tierInfo as TierInfo);
        }
        showAlert.error('Error', error);
      } else {
        showAlert.warning('Sin stock', 'No se encontraron tarjetas disponibles con los criterios seleccionados.');
      }
      setIsSearching(false);
    },
    onError: ({ error }) => {
      showAlert.error(
        'Error al buscar',
        error.serverError || error.validationErrors?._errors?.[0] || 'Ocurrio un error al buscar las tarjetas',
      );
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
          {/* Configuración Header Omitted */}

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

          {/* Ajustes Avanzados */}
          {(allowSearchPreferences || allowBuyRateAdjustment) && (
            <div className="border-border mt-6 border-t pt-4">
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen} className="space-y-4">
                <div className="flex items-center justify-between md:flex-col">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex h-auto items-center gap-1 p-0 hover:bg-transparent">
                      <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase md:text-xs">
                        Ajustes Avanzados
                      </span>
                      <ChevronDown
                        className={`text-muted-foreground h-3.5 w-3.5 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>

                  {allowSearchPreferences && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearPreferences}
                      disabled={!savedMin && !savedMax}
                      className={
                        savedMin || savedMax
                          ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary h-6 px-2 text-xs font-medium'
                          : 'text-muted-foreground h-6 px-2 text-xs'
                      }
                    >
                      Limpiar Filtros
                    </Button>
                  )}
                </div>

                <CollapsibleContent className="space-y-4">
                  {allowBuyRateAdjustment && (
                    <div className="w-full">
                      {!selectedBc ? (
                        <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs">
                          ⚠️ Selecciona un brand y país para ajustar tu tarifa
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
                          <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
                            Mi Tarifa de Compra (%)
                          </Label>
                          <div className="relative w-40 md:w-full">
                            <Input
                              type="number"
                              placeholder="85"
                              min="80"
                              max="100"
                              step="0.1"
                              value={prefBuyRate}
                              onChange={(e) => setPrefBuyRate(e.target.value)}
                              className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-3 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {allowSearchPreferences && (
                    <div className="flex items-center justify-between gap-4 md:flex-row md:gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
                          Min ($)
                        </Label>
                        <Input
                          type="number"
                          placeholder="25"
                          value={prefMin}
                          onChange={(e) => setPrefMin(e.target.value)}
                          className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-3 text-sm"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
                          Max ($)
                        </Label>
                        <Input
                          type="number"
                          placeholder="500"
                          value={prefMax}
                          onChange={(e) => setPrefMax(e.target.value)}
                          className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-3 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSavePreferences}
                    className="bg-muted/50 text-foreground hover:bg-muted h-8 w-full text-xs"
                    variant="outline"
                  >
                    Guardar Ajustes
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
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
                disabled={!bc.isActive}
                onClick={() => handleBrandSelect({ brandId: bc.brandId, countryId: bc.countryId })}
                className={`group relative flex h-20 flex-col items-center justify-center overflow-hidden rounded-xl border-2 pb-1 transition-all md:h-32 ${
                  !bc.isActive
                    ? 'border-border bg-muted/10 cursor-not-allowed opacity-80'
                    : selectedBrand === `${bc.brandId}|${bc.countryId}`
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

                {selectedBrand === `${bc.brandId}|${bc.countryId}` && bc.isActive && (
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
