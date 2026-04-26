'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSellFlow } from '@/hooks/use-sell-flow';
import Image from 'next/image';
import type { BrandStepProps } from '@/components/sell/types';

export function BrandStep({ brands, countries }: BrandStepProps) {
  const { selectedBrand, setSelectedBrand, selectedCountry, setSelectedCountry, setStep } = useSellFlow();

  const [searchBrand, setSearchBrand] = useState('');

  const filteredBrands = brands.filter(
    (brand) => brand.name.toLowerCase().includes(searchBrand.toLowerCase()) || brand.slug.toLowerCase().includes(searchBrand.toLowerCase()),
  );

  const isStep1Valid = selectedBrand && selectedCountry;

  return (
    <div className="grid grid-cols-1 items-start gap-1 md:grid-cols-12 md:gap-6">
      {/* Left Column: Filters */}
      <Card className="border-border bg-card/50 flex flex-col space-y-1.5 px-2 py-2 backdrop-blur-sm md:col-span-4 md:space-y-6 md:p-6">
        <div className="space-y-1">
          {/* País y Buscar - Grilla en mobile para ahorrar espacio vertical */}
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              1. Select Country
            </Label>
            <div className="w-40 md:w-full">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-9 w-full text-sm md:h-11 md:text-base">
                  <SelectValue placeholder="Select Country" />
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

          {/* Search Brand */}
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:justify-start md:gap-2">
            <Label className="text-muted-foreground text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase md:text-xs">
              2. Search or Select a Brand
            </Label>
            <div className="relative w-40 md:w-full">
              <Search className="text-muted-foreground/50 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 md:h-4 md:w-4" />
              <Input
                placeholder="Search Brand"
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-8 pl-9 text-sm md:pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Columna Derecha: Grilla de Marcas */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col gap-1.5 px-1 py-2 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <CardContent className="custom-scrollbar grid flex-1 grid-cols-3 gap-1 overflow-y-auto px-0 sm:grid-cols-3 md:gap-3 md:px-2 md:pr-2 lg:grid-cols-4">
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
        <CardFooter className="p-2">
          <Button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-full font-bold transition-all"
          >
            Continuar <ChevronRight className="ml-1 h-4 w-4 md:ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
