'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Globe } from 'lucide-react';
import Image from 'next/image';
import type { BrandCountry } from '@/types';

export interface BrandCountryGridProps {
  brandCountries: BrandCountry[];
  selectedCountryId: string;
  selectedBrandKey: string | null;
  searchBrand?: string;
  onSelect: (brandId: string, countryId: string) => void;
  showStock?: boolean;
  /** brandCountryId → monto ACCESIBLE para el buyer (tier <= su buyRate). Solo buy wizard. */
  accessibleAmountByBrandCountry?: Record<string, number>;
  emptyMessage?: string;
}

export function BrandCountryGrid({
  brandCountries,
  selectedCountryId,
  selectedBrandKey,
  searchBrand = '',
  onSelect,
  showStock = false,
  accessibleAmountByBrandCountry,
  emptyMessage = 'Selecciona un país primero',
}: BrandCountryGridProps) {
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

  if (!selectedCountryId) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
        <Globe className="text-muted-foreground/30 mb-3 h-12 w-12 md:h-16 md:w-16" />
        <h3 className="text-foreground mb-1.5 text-base font-semibold md:text-lg">{emptyMessage}</h3>
        <p className="text-muted-foreground max-w-xs text-xs md:text-sm">
          Elige un país del dropdown para ver las marcas disponibles en esa región.
        </p>
      </div>
    );
  }

  if (filteredBrandCountries.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
        <h3 className="text-foreground mb-1.5 text-base font-semibold">Sin resultados</h3>
        <p className="text-muted-foreground max-w-xs text-xs">No hay marcas que coincidan con &ldquo;{searchBrand}&rdquo;</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      {filteredBrandCountries.map((bc) => {
        const brandKey = `${bc.brandId}|${bc.countryId}`;
        const isSelected = selectedBrandKey === brandKey;
        const isDisabled = !bc.isActive;
        const accessibleAmount = accessibleAmountByBrandCountry?.[bc.id];

        return (
          <motion.button
            key={`${bc.brandId}_${bc.countryId}`}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            disabled={isDisabled}
            onClick={() => onSelect(bc.brandId, bc.countryId)}
            className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl p-1 transition-all md:aspect-auto md:h-32 md:pb-1 ${
              isDisabled
                ? 'border-border bg-muted/10 cursor-not-allowed opacity-80'
                : isSelected
                  ? 'border-primary bg-primary/10 shadow-primary/20 cursor-pointer shadow-lg'
                  : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40 cursor-pointer'
            }`}
            whileHover={isDisabled ? {} : { scale: 1.02, y: -2 }}
            whileTap={isDisabled ? {} : { scale: 0.98 }}
          >
            <div
              className={`relative mb-0.5 flex h-full w-full items-center justify-center transition-transform duration-300 ${
                isDisabled ? 'opacity-40 grayscale' : 'group-hover:scale-110'
              } dark:bg-white`}
            >
              {bc.brandImage ? (
                <Image src={bc.brandImage} alt={bc.brandName} fill className="rounded-lg object-contain p-0.5" loading="eager" />
              ) : (
                <span className="text-xl md:text-5xl">{bc.brandIcon}</span>
              )}
            </div>
            <div
              className={`w-full shrink-0 truncate px-0.5 text-center text-[10px] font-bold tracking-tight md:px-1 md:text-base ${
                isDisabled ? 'text-muted-foreground' : ''
              }`}
            >
              {bc.brandName}
            </div>

            {showStock && bc.isActive && bc.stockCount > 0 && (
              <div className="flex flex-col items-center gap-0.5">
                {accessibleAmount !== undefined ? (
                  // Buyer tiene tarifa: destacar lo que REALMENTE puede comprar (tier <= su buyRate)
                  accessibleAmount > 0 ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-green-600 md:text-xs dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />${accessibleAmount.toLocaleString()} a tu tasa
                      </span>
                      <span className="text-amber-500 text-[10px] font-semibold md:text-xs">
                        ${bc.stockAmount.toLocaleString()} en plataforma
                      </span>
                    </>
                  ) : (
                    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold md:text-xs">
                      ${bc.stockAmount.toLocaleString()} en plataforma
                    </span>
                  )
                ) : (
                  // Sin mapa de accesibilidad (sell flow) o buyer sin tarifa: comportamiento original
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-green-600 md:text-xs dark:text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />${bc.stockAmount.toLocaleString()} disponible
                  </span>
                )}
              </div>
            )}

            {!bc.isActive && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
                <div className="w-[300%] -rotate-45 border-y border-white/10 bg-black/60 py-1 text-center text-[8px] font-black tracking-[0.2em] whitespace-nowrap uppercase shadow-2xl backdrop-blur-md md:py-3 md:text-[14px] md:tracking-[0.4em]">
                  Coming Soon
                </div>
              </div>
            )}

            {isSelected && bc.isActive && (
              <div className="bg-primary absolute top-1 right-1 rounded-full p-0.5 shadow-lg md:top-2 md:right-2 md:p-1">
                <Check className="text-primary-foreground h-2 w-2 md:h-3 md:w-3" />
              </div>
            )}
          </motion.button>
        );
      })}
    </AnimatePresence>
  );
}
