'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSellFlow } from '@/hooks/use-sell-flow';
import Image from 'next/image';
import type { BrandStepProps } from '../types';

export function BrandStep({ brands, countries }: BrandStepProps) {
  const { selectedBrand, setSelectedBrand, selectedCountry, setSelectedCountry, setStep } = useSellFlow();

  const [searchBrand, setSearchBrand] = useState('');

  const filteredBrands = brands.filter(
    (brand) => brand.name.toLowerCase().includes(searchBrand.toLowerCase()) || brand.slug.toLowerCase().includes(searchBrand.toLowerCase()),
  );

  const isStep1Valid = selectedBrand && selectedCountry;

  return (
    <div className="grid h-full grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Left Column: Filters */}
      <Card className="border-border bg-card/50 flex h-auto flex-col space-y-1.5 p-2 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        {/* País y Buscar - Grilla en mobile para ahorrar espacio vertical */}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-1">
          <div className="space-y-1 md:space-y-2">
            <Label className="text-muted-foreground mb-0.5 block text-[10px] font-semibold tracking-wider uppercase md:text-xs">
              Selecione País
            </Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-9 text-sm md:h-11">
                <SelectValue placeholder="Seleccionar país..." />
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

          <div className="hidden space-y-1 md:block md:space-y-2">
            <Label className="text-muted-foreground mb-0.5 block text-[10px] font-semibold tracking-wider uppercase md:text-xs">
              Buscar marca
            </Label>
            <div className="relative">
              <Search className="text-muted-foreground/50 absolute top-2.5 left-3 h-3.5 w-3.5 md:top-3 md:h-4 md:w-4" />
              <Input
                placeholder="Buscar..."
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-9 pl-9 text-sm md:h-11 md:pl-10 md:text-base"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Columna Derecha: Grilla de Marcas */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col gap-1.5 px-1 py-2 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <CardHeader className="mb-1 flex items-center justify-between md:mb-4">
          <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase md:text-sm">Marcas disponibles</Label>
          <span className="text-muted-foreground/50 text-sm">{filteredBrands.length} ítems</span>
        </CardHeader>

        <CardContent className="custom-scrollbar grid max-h-125 flex-1 grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-3 md:max-h-150 md:gap-3 md:pr-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredBrands.map((brand) => (
              <motion.button
                key={brand.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setSelectedBrand(brand.id)}
                className={`group relative flex h-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 pb-1 transition-all md:h-32 ${
                  selectedBrand === brand.id
                    ? 'border-primary bg-primary/10 shadow-primary/20 shadow-lg'
                    : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40'
                } `}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative mb-0.5 flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-110 md:mb-2 dark:bg-white">
                  {brand.image ? (
                    <Image src={brand.image} alt={brand.name} fill className="rounded-lg object-cover" loading="eager" />
                  ) : (
                    <span className="text-xl md:text-5xl">{brand.icon}</span>
                  )}
                </div>
                <div className="w-full truncate px-1 text-center text-[11px] font-bold tracking-tight md:text-base">{brand.name}</div>

                {selectedBrand === brand.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-primary absolute top-1 right-1 rounded-full p-0.5 shadow-lg md:top-2 md:right-2 md:p-1"
                  >
                    <Check className="text-primary-foreground h-2 w-2 md:h-3 md:w-3" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-full text-sm font-bold transition-all md:h-11 md:text-base"
          >
            Continuar <ChevronRight className="ml-1 h-4 w-4 md:ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
