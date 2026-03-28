"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSellFlow } from "@/hooks/use-sell-flow";
import { getActiveBrands, getActiveCountries } from "@/actions/giftcard-actions";
import Image from "next/image";

interface Brand {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image: string | null;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

export function BrandStep() {
  const { selectedBrand, setSelectedBrand, selectedCountry, setSelectedCountry, setStep } = useSellFlow();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchBrand, setSearchBrand] = useState("");

  useEffect(() => {
    async function fetchData() {
      const [fetchedBrands, fetchedCountries] = await Promise.all([getActiveBrands(), getActiveCountries()]);
      setBrands(fetchedBrands as Brand[]);
      setCountries(fetchedCountries as Country[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredBrands = brands.filter(
    (brand) => brand.name.toLowerCase().includes(searchBrand.toLowerCase()) || brand.slug.toLowerCase().includes(searchBrand.toLowerCase()),
  );

  const isStep1Valid = selectedBrand && selectedCountry;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full items-start">
      {/* Left Column: Filters */}
      <Card className="md:col-span-4 border-border bg-card/50 backdrop-blur-sm p-3 md:p-6 space-y-4 md:space-y-6 flex flex-col h-auto md:h-full sticky top-0 z-20">
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Configuration</h2>
          <p className="text-muted-foreground text-xs md:text-sm">Select region and search brands.</p>
        </div>

        {/* Country & Search - Grid on mobile to save vertical space */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 block">
              Country
            </Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={loading}>
              <SelectTrigger className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 md:h-11 text-sm">
                <SelectValue placeholder={loading ? "Loading..." : "Select country..."} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-muted-foreground text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 block">
              Search Brand
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 md:top-3 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground/50" />
              <Input
                placeholder="Search..."
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                className="pl-9 md:pl-10 border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/50 h-10 md:h-11 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-border flex flex-col gap-2 md:gap-3">
          <div className="text-[10px] text-muted-foreground/70 italic">
            {!isStep1Valid ? "Select country and brand" : "Ready to proceed"}
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 md:h-11 transition-all text-sm font-bold"
          >
            Continue <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>

      {/* Right Column: Brand Grid */}
      <Card className="md:col-span-8 border-border bg-card/50 backdrop-blur-sm p-3 md:p-6 flex flex-col min-h-[400px] md:min-h-[500px]">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <Label className="text-muted-foreground text-[10px] md:text-xs font-semibold uppercase tracking-wider">Available Brands</Label>
          <span className="text-[10px] text-muted-foreground/50">{filteredBrands.length} items</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex-1 max-h-[500px] md:max-h-[600px]">
          <AnimatePresence mode="popLayout">
            {filteredBrands.map((brand) => (
              <motion.button
                key={brand.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
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
                <div className="text-[10px] md:text-sm font-bold text-center tracking-tight truncate w-full px-1">{brand.name}</div>

                {selectedBrand === brand.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 md:top-2 md:right-2 bg-primary rounded-full p-0.5 md:p-1 shadow-lg"
                  >
                    <Check className="w-2 md:w-3 h-2 md:h-3 text-primary-foreground" />
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
