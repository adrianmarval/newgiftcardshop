"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useBuyFlow } from "@/hooks/use-buy-flow";
import { searchGiftcards } from "@/actions";
import Image from "next/image";
import type { Brand, Country } from "@/types";

interface SearchStepProps {
  brands: Brand[];
  countries: Country[];
}

export function SearchStep({ brands, countries }: SearchStepProps) {
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

  const [searchState, setSearchState] = useState<{
    brand: Brand[];
    country: Country[];
    loading: boolean;
    searchBrand: string;
    isSearching: boolean;
  }>({
    brand: brands,
    country: countries,
    loading: false,
    searchBrand: "",
    isSearching: false,
  });

  const filteredBrands = searchState.brand.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchState.searchBrand.toLowerCase()) ||
      brand.slug.toLowerCase().includes(searchState.searchBrand.toLowerCase()),
  );

  const handleSearch = async () => {
    if (!selectedBrand || !targetAmount) return;

    setSearchState((prev) => ({ ...prev, isSearching: true }));
    const amount = parseFloat(targetAmount);
    const response = await searchGiftcards({ brandId: selectedBrand, countryId: selectedCountry, amount });

    if (!response.data) {
      throw new Error("Ocurrio un error al buscar las tarjetas");
    }

    setFoundGiftcards(response.data);
    setSearchState((prev) => ({ ...prev, isSearching: false }));
    setStep(2);
  };

  const isValid = selectedBrand && selectedCountry && targetAmount && parseFloat(targetAmount) > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Left Column: Filters */}
      <Card className="md:col-span-4 border-border bg-card/50 backdrop-blur-sm p-3 md:p-6 space-y-4 md:space-y-6 flex flex-col h-auto md:h-full sticky top-0 z-20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Configuration</h2>
          <p className="text-muted-foreground text-sm md:text-base">What are you looking for?</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider mb-1 block">Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={searchState.loading}>
              <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 md:h-11 text-base">
                <SelectValue placeholder={searchState.loading ? "Loading..." : "Select country..."} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {searchState.country.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider mb-1 block">
              Target Total Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 md:top-3 text-muted-foreground/50 text-base">$</span>
              <Input
                type="number"
                placeholder="Ex: 500"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="pl-7 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 md:h-11 text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider mb-1 block">
              Search Brand
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 md:top-3 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground/50" />
              <Input
                placeholder="Search..."
                value={searchState.searchBrand}
                onChange={(e) => setSearchState((prev) => ({ ...prev, searchBrand: e.target.value }))}
                className="pl-9 md:pl-10 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 md:h-11 text-base"
              />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-border flex flex-col gap-2 md:gap-3">
          <Button
            onClick={handleSearch}
            disabled={!isValid || searchState.isSearching}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 md:h-11 transition-all text-base font-bold shadow-lg shadow-primary/20"
          >
            {searchState.isSearching ? "Finding Cards..." : "Search Availability"}
            {!searchState.isSearching && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </Card>

      {/* Right Column: Brand Grid */}
      <Card className="md:col-span-8 border-border bg-card/50 backdrop-blur-sm p-3 md:p-6 flex flex-col min-h-100 md:min-h-125">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <Label className="text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wider">Available Brands</Label>
          <span className="text-xs text-muted-foreground/50">{filteredBrands.length} items</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex-1 max-h-125 md:max-h-150">
          {filteredBrands.map((brand, idx) => (
            <motion.button
              key={brand.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => setSelectedBrand(brand.id)}
              className={`
                cursor-pointer pb-2 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col items-center justify-center group h-24 md:h-32
                ${
                  selectedBrand === brand.id
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-border bg-muted/20 hover:border-muted-foreground/30 hover:bg-muted/40"
                }
              `}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="dark:bg-white relative w-full h-full mb-1 md:mb-2 transition-transform group-hover:scale-110 duration-300 flex items-center justify-center">
                {brand.image ? (
                  <Image src={brand.image} alt={brand.name} fill className="object-cover rounded-lg" loading="eager" />
                ) : (
                  <span className="text-2xl md:text-5xl">{brand.icon}</span>
                )}
              </div>
              <div className="text-sm md:text-base font-bold text-center tracking-tight truncate w-full px-1">{brand.name}</div>

              {selectedBrand === brand.id && (
                <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-primary rounded-full p-0.5 md:p-1 shadow-lg">
                  <Check className="w-2 md:w-3 h-2 md:h-3 text-primary-foreground" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </Card>
    </div>
  );
}
