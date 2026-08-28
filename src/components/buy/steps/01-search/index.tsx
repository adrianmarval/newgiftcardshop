'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from '@/lib/auth/auth-client';
import { Card, CardContent } from '@/components/ui/card';
import { useBuyFlow, type BuyFlowTierInfo } from '@/hooks/use-buy-flow';
import { useStepHotkeys } from '@/hooks/use-step-hotkeys';
import { searchGiftcards } from '@/actions/buyer/giftcards/search-giftcards';
import { useAction } from 'next-safe-action/hooks';
import { getUserSearchPreferences, updateSearchPreferences, updateBuyRate } from '@/actions/buyer/preferences';
import { getUserBuyRate } from '@/actions/buyer/orders/get-user-buy-rate';
import { showAlert, cn } from '@/lib/ui';
import type { BrandCountry } from '@/types';
import { BuyStepsProgress } from '../shared/buy-steps-progress';
import { CompactSearchBar } from './compact-search-bar';
import { AdvancedSettingsSheet } from './advanced-settings-sheet';
import { BrandCountryGrid, StepFooter, FieldError } from '@/components/common';

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
  const [prefMin, setPrefMin] = useState('');
  const [prefMax, setPrefMax] = useState('');
  const [savedMin, setSavedMin] = useState('');
  const [savedMax, setSavedMax] = useState('');
  const [allowSearchPreferences, setAllowSearchPreferences] = useState(false);
  const [allowBuyRateAdjustment, setAllowBuyRateAdjustment] = useState(false);
  const [prefBuyRate, setPrefBuyRate] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

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

  // Auto-select US on first mount if nothing selected
  useEffect(() => {
    if (!selectedCountry && brandCountries.length > 0) {
      const usCountry = brandCountries.find((bc) => bc.countryCode === 'US');
      if (usCountry) {
        setSelectedCountry(usCountry.countryId);
      }
    }
  }, [brandCountries]);

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
            showAlert
              .confirm(
                'Sin stock para tu tasa',
                <div className="space-y-1 text-left text-sm leading-relaxed">
                  <p>
                    Tu tasa: <strong>{tierInfoData.buyerBuyRate}%</strong>
                  </p>
                  <p>
                    Stock disponible (no para tu tasa): <strong>${Number(tierInfoData.inaccessibleAmount).toFixed(2)}</strong> en{' '}
                    {tierInfoData.inaccessibleCardCount} tarjetas
                  </p>
                  <hr className="border-border my-3" />
                  <p>
                    ⏱️ La próxima tarjeta estará disponible en <strong>~{tierInfoData.estimatedMinutes} min</strong>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    (Tier {tierInfoData.nextCardTier}% → {tierInfoData.buyerBuyRate}%)
                  </p>
                </div>,
                { confirmText: 'Reintentar ahora', cancelText: 'Entendido' },
              )
              .then((retry) => {
                if (retry) handleSearch();
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
    },
    onError: ({ error }) => {
      showAlert.error(
        'Error al buscar',
        error.serverError || error.validationErrors?._errors?.[0] || 'Ocurrio un error al buscar las tarjetas',
      );
    },
  });

  const handleSearch = () => {
    if (!selectedBrand || !targetAmount || parseFloat(targetAmount) <= 0 || rateError) {
      setAttempted(true);
      return;
    }

    const amount = parseFloat(targetAmount);
    const [brandId, countryId] = selectedBrand.split('|');
    execute({ brandId, countryId, amount });
  };

  const handleAmountChange = (value: string) => {
    setAmountTouched(true);
    setTargetAmount(value);
  };

  const handleCountryChange = (val: string) => {
    setSelectedCountry(val);
    setSelectedBrand('');
  };

  const handleBrandSelect = (bc: { brandId: string; countryId: string }) => {
    setSelectedBrand(`${bc.brandId}|${bc.countryId}`);
  };

  const brandError = !selectedBrand ? 'Seleccioná una marca y país' : null;
  const amountError = !targetAmount || parseFloat(targetAmount) <= 0 ? 'Ingresá un monto válido' : null;

  // Browser-style validation: solo mostrar después de interactuar (touched)
  // o de intentar continuar (attempted). Nunca en el mount inicial.
  const showBrandError = attempted ? brandError : null;
  const showAmountError = attempted || amountTouched ? amountError : null;

  useStepHotkeys({
    onContinue: handleSearch,
    enabled: status !== 'executing' && !advancedOpen,
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <BuyStepsProgress />

      <div data-tour="buy-search">
        <CompactSearchBar
          brandCountries={brandCountries}
          selectedCountry={selectedCountry}
          targetAmount={targetAmount}
          searchBrand={searchBrand}
          onCountryChange={handleCountryChange}
          onAmountChange={handleAmountChange}
          onSearchChange={setSearchBrand}
          onOpenAdvanced={() => setAdvancedOpen(true)}
          showAdvancedButton={allowSearchPreferences || allowBuyRateAdjustment}
          autoFocusAmount
          amountError={showAmountError}
        />
      </div>

      <Card
        className={cn(
          'flex min-h-0 flex-1 flex-col border py-0 backdrop-blur-sm md:col-span-8 md:row-span-11 md:h-full',
          showBrandError && 'border-destructive/50 ring-destructive/30 ring-1',
        )}
      >
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
        <div className="px-2 pb-1 md:px-2">
          <FieldError message={showBrandError} />
        </div>
      </Card>

      {/* Rate error (API-level, not field-level) */}
      {rateError && selectedBrand && (
        <p className="text-destructive mb-1 animate-pulse text-center text-lg font-medium">{rateError}</p>
      )}

      {/* CTA */}
      <StepFooter
        ctaLabel="Consultar Disponibilidad"
        ctaLoading={status === 'executing'}
        ctaDisabled={status === 'executing'}
        onContinue={handleSearch}
      />

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
