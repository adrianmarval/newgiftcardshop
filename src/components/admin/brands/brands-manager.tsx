'use client';

import { useState, useMemo, type ComponentType, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Search, Edit2, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';
import {
  listBrands,
  createBrand,
  deleteBrand,
  addCountryToBrand,
  updateBrandCountryLimits,
  removeCountryFromBrand,
  toggleBrandActive,
  toggleBrandCountryActive,
} from '@/actions/admin/catalog';
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

  const [newBrand, setNewBrand] = useState({ name: '', slug: '', icon: '📦', image: '' });
  const [newCountry, setNewCountry] = useState({ countryId: '', minAmount: '', maxAmount: '', claimCodePattern: '' });
  const [countryLimits, setCountryLimits] = useState<{ minAmount: string; maxAmount: string; claimCodePattern: string; stockReminderInterval: string }>({
    minAmount: '',
    maxAmount: '',
    claimCodePattern: '',
    stockReminderInterval: '',
  });

  const { execute: executeCreate, status: createStatus } = useAction(createBrand, {
    onSuccess: () => {
      showAlert.toast.success('Brand created');
      setIsCreateDialogOpen(false);
      setNewBrand({ name: '', slug: '', icon: '📦', image: '' });
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error creating brand: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeDelete, status: deleteStatus } = useAction(deleteBrand, {
    onSuccess: () => {
      showAlert.toast.success('Brand deleted');
      setSelectedBrandId(null);
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error deleting brand: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeAddCountry, status: addCountryStatus } = useAction(addCountryToBrand, {
    onSuccess: () => {
      showAlert.toast.success('Country added');
      setIsAddCountryDialogOpen(false);
      setNewCountry({ countryId: '', minAmount: '', maxAmount: '', claimCodePattern: '' });
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error adding country: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeUpdateLimits, status: updateLimitsStatus } = useAction(updateBrandCountryLimits, {
    onSuccess: () => {
      showAlert.toast.success('Limits updated');
      setEditingCountry(null);
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error updating limits: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeRemoveCountry, status: removeCountryStatus } = useAction(removeCountryFromBrand, {
    onSuccess: () => {
      showAlert.toast.success('Country removed');
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error removing country: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeToggleBrand, status: toggleBrandStatus } = useAction(toggleBrandActive, {
    onSuccess: () => refreshBrands(),
    onError: (e) => showAlert.toast.error('Error toggling brand: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeToggleCountry, status: toggleCountryStatus } = useAction(toggleBrandCountryActive, {
    onSuccess: () => refreshBrands(),
    onError: (e) => showAlert.toast.error('Error toggling country: ' + (e.error?.serverError || 'Unknown error')),
  });

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

  const handleCreateBrand = () => {
    if (!newBrand.name || !newBrand.slug) return;
    executeCreate({
      name: newBrand.name,
      slug: newBrand.slug,
      icon: newBrand.icon,
      image: newBrand.image || null,
    });
  };

  const handleAddCountry = () => {
    if (!selectedBrand || !newCountry.countryId) return;
    executeAddCountry({
      brandId: selectedBrand.id,
      countryId: newCountry.countryId,
      minAmount: newCountry.minAmount ? parseFloat(newCountry.minAmount) : null,
      maxAmount: newCountry.maxAmount ? parseFloat(newCountry.maxAmount) : null,
      claimCodePattern: newCountry.claimCodePattern || null,
    });
  };

  const openEditCountry = (bc: BrandCountrySummary) => {
    setEditingCountry(bc);
    setCountryLimits({
      minAmount: bc.minAmount?.toString() || '',
      maxAmount: bc.maxAmount?.toString() || '',
      claimCodePattern: bc.claimCodePattern || '',
      stockReminderInterval: bc.stockReminderIntervalMinutes?.toString() || '',
    });
  };

  const handleUpdateLimits = () => {
    if (!selectedBrand || !editingCountry) return;
    executeUpdateLimits({
      brandId: selectedBrand.id,
      countryId: editingCountry.countryId,
      minAmount: countryLimits.minAmount ? parseFloat(countryLimits.minAmount) : null,
      maxAmount: countryLimits.maxAmount ? parseFloat(countryLimits.maxAmount) : null,
      claimCodePattern: countryLimits.claimCodePattern || null,
      stockReminderIntervalMinutes: countryLimits.stockReminderInterval ? parseInt(countryLimits.stockReminderInterval, 10) : null,
    });
  };

  // Contenedor adaptativo: Drawer bottom en mobile / Dialog centrado en desktop (patrón PromptDrawer)
  const FormRoot: ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; children?: ReactNode }> = isMobile
    ? Drawer
    : Dialog;
  const FormContent: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerContent : DialogContent;
  const FormHeader: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerHeader : DialogHeader;
  const FormTitle: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerTitle : DialogTitle;
  const FormDescription: ComponentType<{ className?: string; children?: ReactNode }> = isMobile
    ? DrawerDescription
    : DialogDescription;
  const FormFooter: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerFooter : DialogFooter;

  const brandDetail = selectedBrand ? (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            {selectedBrand.image ? (
              <Image
                src={selectedBrand.image}
                alt={selectedBrand.name}
                width={40}
                height={40}
                className="rounded object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
            ) : (
              <span className="text-3xl">{selectedBrand.icon}</span>
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{selectedBrand.name}</CardTitle>
            <span className="text-muted-foreground text-sm">/{selectedBrand.slug}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant={selectedBrand.isActive ? 'outline' : 'default'}
            size="sm"
            onClick={() => executeToggleBrand({ id: selectedBrand.id, isActive: !selectedBrand.isActive })}
            disabled={toggleBrandStatus === 'executing'}
          >
            {selectedBrand.isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (await showAlert.confirm('Delete brand', 'Delete this brand?')) {
                executeDelete({ id: selectedBrand.id });
              }
            }}
            disabled={deleteStatus === 'executing'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Countries ({selectedBrand.countries.length})</h3>
        <Button size="sm" className="gap-1" disabled={availableCountries.length === 0} onClick={() => setIsAddCountryDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add Country
        </Button>
      </div>

      <div className="space-y-1">
        {selectedBrand.countries.map((bc) => (
          <div
            key={bc.id}
            className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center ${
              bc.isActive ? 'border-border' : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded">
                <Globe className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium">{bc.countryName}</span>
                  <span className="text-muted-foreground text-xs">({bc.countryCode})</span>
                  {!bc.isActive && (
                    <Badge variant="outline" className="border-amber-500 text-xs text-amber-500">
                      Inactive
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground block text-xs">
                  Limits: ${bc.minAmount ?? '—'} - ${bc.maxAmount ?? '—'}
                </span>
                <span className="text-muted-foreground block text-[10px]">
                  Reminder: {bc.stockReminderIntervalMinutes ? `${bc.stockReminderIntervalMinutes} min` : 'global'}
                </span>
                {bc.claimCodePattern && (
                  <span className="text-muted-foreground block text-[10px] break-all">Code pattern: {bc.claimCodePattern}</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1 self-end sm:self-auto">
              <Button size="sm" variant="outline" onClick={() => openEditCountry(bc)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={bc.isActive ? 'outline' : 'default'}
                onClick={() => executeToggleCountry({ brandId: selectedBrand.id, countryId: bc.countryId, isActive: !bc.isActive })}
                disabled={toggleCountryStatus === 'executing'}
              >
                {bc.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  if (await showAlert.confirm('Remove country', 'Remove this country from brand?')) {
                    executeRemoveCountry({ brandId: selectedBrand.id, countryId: bc.countryId });
                  }
                }}
                disabled={removeCountryStatus === 'executing'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
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
            <CardContent className="custom-scrollbar h-full overflow-y-auto pt-6">{brandDetail}</CardContent>
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
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">{brandDetail}</div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Create Brand */}
      <FormRoot open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <FormContent>
          <FormHeader className={isMobile ? 'items-start text-left' : undefined}>
            <FormTitle>Create New Brand</FormTitle>
            <FormDescription className="sr-only">Detalles de la nueva marca</FormDescription>
          </FormHeader>
          <div className={isMobile ? 'custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2' : 'space-y-2 py-4'}>
            <div>
              <Label>Name</Label>
              <Input value={newBrand.name} onChange={(e) => setNewBrand((p) => ({ ...p, name: e.target.value }))} placeholder="Amazon" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={newBrand.slug}
                onChange={(e) => setNewBrand((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="amazon"
              />
            </div>
            <div>
              <Label>Icon (Emoji)</Label>
              <Input value={newBrand.icon} onChange={(e) => setNewBrand((p) => ({ ...p, icon: e.target.value }))} placeholder="📦" />
            </div>
          </div>
          <FormFooter className={isMobile ? undefined : 'flex-row justify-end gap-2'}>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBrand} disabled={createStatus === 'executing'}>
              Create
            </Button>
          </FormFooter>
        </FormContent>
      </FormRoot>

      {/* Add Country */}
      <FormRoot open={isAddCountryDialogOpen} onOpenChange={setIsAddCountryDialogOpen}>
        <FormContent>
          <FormHeader className={isMobile ? 'items-start text-left' : undefined}>
            <FormTitle>Add Country to {selectedBrand?.name}</FormTitle>
            <FormDescription className="sr-only">Configuración del país a añadir</FormDescription>
          </FormHeader>
          <div className={isMobile ? 'custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2' : 'space-y-2 py-4'}>
            <div>
              <Label>Country</Label>
              <Select value={newCountry.countryId} onValueChange={(v) => setNewCountry((p) => ({ ...p, countryId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {availableCountries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min Amount (optional)</Label>
                <Input
                  type="number"
                  value={newCountry.minAmount}
                  onChange={(e) => setNewCountry((p) => ({ ...p, minAmount: e.target.value }))}
                  placeholder="5"
                />
              </div>
              <div>
                <Label>Max Amount (optional)</Label>
                <Input
                  type="number"
                  value={newCountry.maxAmount}
                  onChange={(e) => setNewCountry((p) => ({ ...p, maxAmount: e.target.value }))}
                  placeholder="500"
                />
              </div>
            </div>
            <div>
              <Label>Claim Code Pattern (optional)</Label>
              <Input
                value={newCountry.claimCodePattern}
                onChange={(e) => setNewCountry((p) => ({ ...p, claimCodePattern: e.target.value }))}
                placeholder="^[A-Z0-9]{14,15}$"
              />
              <p className="text-muted-foreground mt-1 text-[10px]">
                Regex applied to normalized code (no hyphens/spaces). Default: ^[A-Z0-9]&#123;14,15&#125;$
              </p>
            </div>
          </div>
          <FormFooter className={isMobile ? undefined : 'flex-row justify-end gap-2'}>
            <Button variant="outline" onClick={() => setIsAddCountryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCountry} disabled={addCountryStatus === 'executing' || !newCountry.countryId}>
              Add
            </Button>
          </FormFooter>
        </FormContent>
      </FormRoot>

      {/* Edit Country Limits */}
      <FormRoot open={!!editingCountry} onOpenChange={(open) => !open && setEditingCountry(null)}>
        <FormContent>
          <FormHeader className={isMobile ? 'items-start text-left' : undefined}>
            <FormTitle>
              Edit {editingCountry?.countryName} ({editingCountry?.countryCode})
            </FormTitle>
            <FormDescription className="sr-only">Límites y configuración del país</FormDescription>
          </FormHeader>
          <div className={isMobile ? 'custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2' : 'space-y-2 py-4'}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={countryLimits.minAmount}
                  onChange={(e) => setCountryLimits((p) => ({ ...p, minAmount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Max Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={countryLimits.maxAmount}
                  onChange={(e) => setCountryLimits((p) => ({ ...p, maxAmount: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Claim Code Pattern</Label>
              <Input
                placeholder="^[A-Z0-9]{14,15}$"
                value={countryLimits.claimCodePattern}
                onChange={(e) => setCountryLimits((p) => ({ ...p, claimCodePattern: e.target.value }))}
              />
            </div>
            <div>
              <Label>Stock Reminder Interval (min)</Label>
              <Input
                type="number"
                min={15}
                max={1440}
                placeholder="Global"
                value={countryLimits.stockReminderInterval}
                onChange={(e) => setCountryLimits((p) => ({ ...p, stockReminderInterval: e.target.value }))}
              />
              <p className="text-muted-foreground mt-1 text-[10px]">Leave empty to use the global setting.</p>
            </div>
          </div>
          <FormFooter className={isMobile ? undefined : 'flex-row justify-end gap-2'}>
            <Button variant="outline" onClick={() => setEditingCountry(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLimits} disabled={updateLimitsStatus === 'executing'}>
              Save
            </Button>
          </FormFooter>
        </FormContent>
      </FormRoot>
    </div>
  );
}
