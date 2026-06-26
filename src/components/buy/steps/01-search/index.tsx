'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from '@/lib/auth/auth-client';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBuyFlow, type BuyFlowTierInfo } from '@/hooks/use-buy-flow';
import { searchGiftcards } from '@/actions/buyer/giftcards/search-giftcards';
import { useAction } from 'next-safe-action/hooks';
import { getUserSearchPreferences, updateSearchPreferences, updateBuyRate } from '@/actions/buyer/preferences';
import { getUserBuyRate } from '@/actions/buyer/orders/get-user-buy-rate';
import { showAlert, showSwal } from '@/lib/ui';
import Swal from 'sweetalert2';
import type { BrandCountry } from '@/types';
import { BuyStepsProgress } from '../shared/buy-steps-progress';
import { CompactSearchBar } from './compact-search-bar';
import { AdvancedSettingsSheet } from './advanced-settings-sheet';
import { BrandCountryGrid } from '@/components/common';

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

  const { execute: executeGetPrefs } = useAction(getUserSearchPreferences, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        const minStr = data.minAmount?.toString() || '';
        const maxStr = data.maxAmount?.toString() || '';
        setPrefMin(minStr);
        setPrefMax(maxStr);
        setSavedMin(minStr);
        setSavedMax(maxStr);
        setAllowSearchPreferences(data.allowSearchPreferences || false);
        setAllowBuyRateAdjustment(data.allowBuyRateAdjustment || false);
      }
    },
  });

  const selectedBc = useMemo(() => {
    if (!selectedBrand) return null;
    const [bId, cId] = selectedBrand.split('|');
    return brandCountries.find((bc) => bc.brandId === bId && bc.countryId === cId) || null;
  }, [selectedBrand, brandCountries]);

  useEffect(() => {
    if (session?.user?.id) {
      executeGetPrefs();
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
        if (brResult?.serverError) {
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
        const tierInfoData = tierInfo as BuyFlowTierInfo | undefined;
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <BuyStepsProgress />

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

      <Card className="flex min-h-0 flex-1 flex-col border py-0 backdrop-blur-sm md:col-span-8 md:row-span-11 md:h-full">
        <CardContent className="custom-scrollbar grid flex-1 auto-rows-max grid-cols-3 gap-1.5 overflow-y-auto p-1.5 sm:grid-cols-3 md:gap-1 md:p-2">
          <BrandCountryGrid
            brandCountries={brandCountries}
            selectedCountryId={selectedCountry}
            selectedBrandKey={selectedBrand}
            searchBrand={searchBrand}
            onSelect={(brandId, countryId) => handleBrandSelect({ brandId, countryId })}
            showStock
          />
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
