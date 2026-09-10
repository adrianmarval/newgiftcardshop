'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';
import { listBrands } from '@/actions/admin/catalog';
import { BrandDetail } from './brand-detail';
import { BrandFormDialogs } from './brand-form-dialogs';
import type { BrandWithCountries, BrandCountrySummary, Country } from '@/types';

interface BrandsManagerProps {
  brands: BrandWithCountries[];
  countries: Country[];
}

export function BrandsManager({ brands: initialBrands, countries }: BrandsManagerProps) {
  const isMobile = useIsMobile();
  const [brands, setBrands] = useState(initialBrands);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddCountryDialogOpen, setIsAddCountryDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<BrandCountrySummary | null>(null);

  const refreshBrands = async () => {
    const result = await listBrands();
    if (result.data?.success) {
      setBrands(result.data.brands);
    }
  };

  const selectedBrand = useMemo(() => brands.find((b) => b.id === selectedBrandId), [brands, selectedBrandId]);

  const filteredBrands = useMemo(() => {
    if (!searchQuery) return brands;
    const q = searchQuery.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }, [brands, searchQuery]);

  const availableCountries = useMemo(() => {
    if (!selectedBrand) return countries;
    const usedCountryIds = new Set(selectedBrand.countries.map((c) => c.countryId));
    return countries.filter((c) => !usedCountryIds.has(c.id));
  }, [selectedBrand, countries]);

  const detail = selectedBrand ? (
    <BrandDetail
      brand={selectedBrand}
      canAddCountry={availableCountries.length > 0}
      onAddCountry={() => setIsAddCountryDialogOpen(true)}
      onEditCountry={setEditingCountry}
      onChanged={refreshBrands}
      onDeleted={() => setSelectedBrandId(null)}
    />
  ) : null;

  return (
    <div className="flex h-full flex-col gap-1 md:flex-row">
      {/* Left Panel: Brands List */}
      <Card className="flex w-full shrink-0 flex-col overflow-hidden md:w-1/3 md:min-w-[320px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Brands</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input placeholder="Search brands..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="custom-scrollbar flex-1 space-y-1 overflow-y-auto">
          <AnimatePresence>
            {filteredBrands.map((brand) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex cursor-pointer items-center gap-1 rounded-lg border p-3 transition-colors ${
                  selectedBrandId === brand.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedBrandId(brand.id)}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${brand.isActive ? 'bg-blue-500/10' : 'bg-muted'}`}>
                  {brand.image ? (
                    <Image
                      src={brand.image}
                      alt={brand.name}
                      width={32}
                      height={32}
                      className="rounded object-contain"
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  ) : (
                    <span className="text-xl">{brand.icon}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-medium">{brand.name}</span>
                    {!brand.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">{brand.countries.length} countries</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Right Panel (desktop): Brand Details */}
      {!isMobile && (
        <Card className="w-full flex-1 md:w-auto">
          {selectedBrand ? (
            <CardContent className="custom-scrollbar h-full overflow-y-auto pt-6">{detail}</CardContent>
          ) : (
            <CardContent className="flex h-full items-center justify-center">
              <div className="text-muted-foreground text-center">
                <Globe className="mx-auto h-12 w-12 opacity-30" />
                <p>Select a brand to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Brand Details (mobile): bottom Drawer */}
      {isMobile && (
        <Drawer open={!!selectedBrand} onOpenChange={(open) => !open && setSelectedBrandId(null)}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{selectedBrand?.name ?? 'Brand details'}</DrawerTitle>
              <DrawerDescription>Brand countries and limits</DrawerDescription>
            </DrawerHeader>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">{detail}</div>
          </DrawerContent>
        </Drawer>
      )}

      <BrandFormDialogs
        isCreateOpen={isCreateDialogOpen}
        onCreateOpenChange={setIsCreateDialogOpen}
        isAddCountryOpen={isAddCountryDialogOpen}
        onAddCountryOpenChange={setIsAddCountryDialogOpen}
        editingCountry={editingCountry}
        onEditingCountryChange={setEditingCountry}
        selectedBrand={selectedBrand ?? null}
        availableCountries={availableCountries}
        onChanged={refreshBrands}
      />
    </div>
  );
}
