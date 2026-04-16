'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
      <Card className="border-border bg-card/50 sticky top-0 z-20 flex h-auto flex-col space-y-3 p-3 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <h2 className="mb-0.5 text-lg font-bold md:mb-2 md:text-2xl">Batch configuration</h2>
          <p className="text-muted-foreground hidden text-xs md:block md:text-base">Choose country and brand.</p>
        </div>

        {/* Country & Search - Grid on mobile to save vertical space */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">
          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wider uppercase md:text-xs">Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 text-base md:h-11">
                <SelectValue placeholder="Select a country..." />
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

          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wider uppercase md:text-xs">
              Search brand
            </Label>
            <div className="relative">
              <Search className="text-muted-foreground/50 absolute top-2.5 left-3 h-3.5 w-3.5 md:top-3 md:h-4 md:w-4" />
              <Input
                placeholder="Search..."
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 pl-9 text-base md:h-11 md:pl-10"
              />
            </div>
          </div>
        </div>

        <div className="border-border mt-auto flex flex-col gap-2 border-t pt-4 md:gap-3 md:pt-6">
          <div className="text-muted-foreground/70 text-sm italic">
            {!isStep1Valid ? 'Select country and brand' : 'Ready to load cards'}
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full text-base font-bold transition-all md:h-11"
          >
            Continue to intake <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Right Column: Brand Grid */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-3 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <Label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase md:text-sm">Available brands</Label>
          <span className="text-muted-foreground/50 text-sm">{filteredBrands.length} items</span>
        </div>

        <div className="custom-scrollbar grid max-h-125 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:max-h-150 md:gap-3 md:pr-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredBrands.map((brand) => (
              <motion.button
                key={brand.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setSelectedBrand(brand.id)}
                className={`group relative flex h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 pb-2 transition-all md:h-32 ${
                  selectedBrand === brand.id
                    ? 'border-primary bg-primary/10 shadow-primary/20 shadow-lg'
                    : 'border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40'
                } `}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative mb-1 flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-110 md:mb-2 dark:bg-white">
                  {brand.image ? (
                    <Image src={brand.image} alt={brand.name} fill className="rounded-lg object-cover" loading="eager" />
                  ) : (
                    <span className="text-2xl md:text-5xl">{brand.icon}</span>
                  )}
                </div>
                <div className="w-full truncate px-1 text-center text-sm font-bold tracking-tight md:text-base">{brand.name}</div>

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
        </div>
      </Card>
    </div>
  );
}
