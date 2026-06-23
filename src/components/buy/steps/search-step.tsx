'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Globe, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBuyFlow, type TierInfo } from '@/hooks/use-buy-flow';
import { searchGiftcards } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import { getUserSearchPreferences, updateSearchPreferences, updateBuyRate } from '@/actions/buyer/preferences';
import { getUserBuyRate } from '@/actions/buyer/orders/get-user-buy-rate';
import { showAlert, showSwal } from '@/lib/swal';
import Swal from 'sweetalert2';
import { BrandCountry } from '@/types';
import { BuyStepsProgress } from '@/components/buy/steps/buy-steps-progress';
import { CompactSearchBar } from '@/components/buy/steps/compact-search-bar';
import { AdvancedSettingsSheet } from '@/components/buy/steps/advanced-settings-sheet';

export interface SearchStepProps {
  brandCountries: BrandCountry[];
}

export function SearchStep({ brandCountries }: SearchStepProps) {
  const { data: session } = useSession();
  const {
    selectedBrand,
    setSelectedBrand,
    selectedCountry,
    setSelectedCountry,
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!allowBuyRateAdjustment) return;
    if (selectedBcId) {
      getUserBuyRate({ brandCountryId: selectedBcId }).then((res) => {
        if (res?.data?.success && res.data.rate) {
          setPrefBuyRate((res.data.rate * 100).toString());
        }
      });
    }
  }, [selectedBcId, allowBuyRateAdjustment]);

  useEffect(() => {
    if (selectedBc?.countryCurrency) {
      setSelectedCurrency(selectedBc.countryCurrency);
    } else {
      setSelectedCurrency('USD');
    }
  }, [selectedBc, setSelectedCurrency]);

  useEffect(() => {
    if (!selectedBrand) {
      setRateError(null);
      return;
    }
    const [brandId, countryId] = selectedBrand.split('|');
    setRateError(null);
    getUserBuyRate({ brandId, countryId }).then((res) => {
      if (!res?.data?.success) {
        setRateError('No tienes tarifa asignada para comprar en esta marca y país. Contactá al administrador.');
      }
    });
  }, [selectedBrand]);

  const handleClearPreferences = async () => {
    setPrefMin('');
    setPrefMax('');
    setSavedMin('');
    setSavedMax('');
    setPrefBuyRate('');

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
        }
      }

      if (brUpdated) {
        showAlert.toast.success('Ajustes guardados correctamente');
        setSavedMin(prefMin);
        setSavedMax(prefMax);
        setAdvancedOpen(false);
      }
    }
  };

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
        setFoundGiftcards(giftcards);
        if (tierInfo) {
          setTierInfo(tierInfo);
        }
        setStep(2);
      } else if (error) {
        const tierInfoData = tierInfo as TierInfo | undefined;
        if (tierInfoData) {
          setTierInfo(tierInfoData);
        }
        if (error.includes('No hay tarjetas disponibles para tu tasa')) {
          if (tierInfoData && tierInfoData.estimatedMinutes != null && tierInfoData.nextCardTier != null) {
            showSwal
              .fire({
                icon: 'info',
                title: 'Sin stock para tu tasa',
                html: `
                <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                  <p>Tu tasa: <strong>${tierInfoData.buyerBuyRate}%</strong></p>
                  <p>Stock disponible (no para tu tasa): <strong>$${Number(tierInfoData.inaccessibleAmount).toFixed(2)}</strong> en ${tierInfoData.inaccessibleCardCount} tarjetas</p>
                  <hr style="border-color: #333; margin: 12px 0;">
                  <p>⏱️ La próxima tarjeta estará disponible en <strong>~${tierInfoData.estimatedMinutes} min</strong></p>
                  <p style="font-size: 12px; color: #888;">(Tier ${tierInfoData.nextCardTier}% → ${tierInfoData.buyerBuyRate}%)</p>
                </div>
              `,
                confirmButtonText: 'Entendido',
                showCancelButton: true,
                cancelButtonText: 'Reintentar ahora',
              })
              .then((result) => {
                if (result.dismiss === Swal.DismissReason.cancel) {
                  handleSearch();
                }
              });
          } else {
            showAlert.info('Disponibilidad', error);
          }
        } else if (error.includes('límite de crédito') || error.includes('excedería')) {
          showAlert.warning('Límite de crédito', error);
        } else if (error.includes('tarjeta más chica') || error.includes('combinación exacta')) {
          showAlert.warning('Aviso de Stock', error);
        } else {
          showAlert.error('Error', error);
        }
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

  const isValid = selectedBrand && targetAmount && parseFloat(targetAmount) > 0 && !rateError;
  const showEmptyState = !selectedCountry;

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <BuyStepsProgress />

      {/* Compact Search Bar */}
      <CompactSearchBar
        brandCountries={brandCountries}
        selectedCountry={selectedCountry}
        targetAmount={targetAmount}
        searchBrand={searchBrand}
        onCountryChange={handleCountryChange}
        onAmountChange={setTargetAmount}
        onSearchChange={setSearchBrand}
        onOpenAdvanced={() => setAdvancedOpen(true)}
        showAdvancedButton={allowSearchPreferences || allowBuyRateAdjustment}
      />

      {/* Brand Grid */}
      <Card className="flex min-h-0 flex-1 flex-col border py-0 backdrop-blur-sm md:col-span-8 md:row-span-11 md:h-full">
        <CardContent className="custom-scrollbar grid flex-1 auto-rows-max grid-cols-3 gap-1.5 overflow-y-auto p-1.5 sm:grid-cols-3 md:gap-1 md:p-2">
          {showEmptyState ? (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
              <Globe className="text-muted-foreground/30 mb-3 h-12 w-12 md:h-16 md:w-16" />
              <h3 className="text-foreground mb-1.5 text-base font-semibold md:text-lg">Selecciona un país primero</h3>
              <p className="text-muted-foreground max-w-xs text-xs md:text-sm">
                Elige un país del dropdown para ver las marcas disponibles en esa región.
              </p>
            </div>
          ) : filteredBrandCountries.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
              <h3 className="text-foreground mb-1.5 text-base font-semibold">Sin resultados</h3>
              <p className="text-muted-foreground max-w-xs text-xs">No hay marcas que coincidan con &ldquo;{searchBrand}&rdquo;</p>
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
                  onClick={() => handleBrandSelect({ brandId: bc.brandId, countryId: bc.countryId })}
                  className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl p-1 transition-all md:aspect-auto md:h-32 md:pb-1 ${
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
                    className={`w-full truncate px-1 text-center text-[10px] font-bold tracking-tight md:px-2 md:text-base ${!bc.isActive ? 'text-muted-foreground' : ''}`}
                  >
                    {bc.brandName}
                  </div>

                  {bc.isActive && bc.stockCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-green-600 md:text-xs dark:text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />${bc.stockAmount.toLocaleString()} disponible
                    </span>
                  )}

                  {!bc.isActive && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
                      <div className="w-[300%] -rotate-45 border-y border-white/10 bg-black/60 py-1 text-center text-[8px] font-black tracking-[0.2em] whitespace-nowrap uppercase shadow-2xl backdrop-blur-md md:py-2 md:text-[12px] md:tracking-[0.4em]">
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
              ))}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* CTA - Sticky on mobile */}
      <div className="shrink-0">
        {rateError && selectedBrand && <p className="animate-pulse text-destructive mb-1 text-center text-lg font-medium">{rateError}</p>}
        <Button
          onClick={handleSearch}
          disabled={!isValid || status === 'executing'}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full text-sm font-bold md:h-11 md:text-base"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Consultando...
            </>
          ) : (
            <>
              Consultar Disponibilidad
              <ChevronRight className="ml-1.5 h-4 w-4 md:ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Advanced Settings Sheet */}
      <AdvancedSettingsSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        prefMin={prefMin}
        prefMax={prefMax}
        prefBuyRate={prefBuyRate}
        savedMin={savedMin}
        savedMax={savedMax}
        allowSearchPreferences={allowSearchPreferences}
        allowBuyRateAdjustment={allowBuyRateAdjustment}
        selectedBcExists={!!selectedBc}
        onMinChange={setPrefMin}
        onMaxChange={setPrefMax}
        onBuyRateChange={setPrefBuyRate}
        onClear={handleClearPreferences}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
