'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Search, Edit2, X, Check, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/swal';
import Image from 'next/image';
import {
  getAllBrands,
  createBrand,
  deleteBrand,
  addCountryToBrand,
  updateBrandCountryLimits,
  removeCountryFromBrand,
  toggleBrandActive,
  toggleBrandCountryActive,
  updateBrandCountryRate,
} from '@/actions/admin/catalog';

interface BrandWithCountries {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image: string | null;
  isActive: boolean;
  countries: BrandCountry[];
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface BrandCountry {
  id: string;
  countryId: string;
  countryName: string;
  countryCode: string;
  minAmount: number | null;
  maxAmount: number | null;
  isActive: boolean;
  buyRate: number | null;
  sellRate: number | null;
}

interface BrandsManagerProps {
  brands: BrandWithCountries[];
  countries: Country[];
}

export function BrandsManager({ brands: initialBrands, countries }: BrandsManagerProps) {
  const [brands, setBrands] = useState(initialBrands);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddCountryDialogOpen, setIsAddCountryDialogOpen] = useState(false);
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);

  const [newBrand, setNewBrand] = useState({ name: '', slug: '', icon: '📦', image: '' });
  const [newCountry, setNewCountry] = useState({ countryId: '', minAmount: '', maxAmount: '' });
  const [countryLimits, setCountryLimits] = useState<{ minAmount: string; maxAmount: string; buyRate: string; sellRate: string }>({
    minAmount: '',
    maxAmount: '',
    buyRate: '',
    sellRate: '',
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
      setNewCountry({ countryId: '', minAmount: '', maxAmount: '' });
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error adding country: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeUpdateLimits, status: updateLimitsStatus } = useAction(updateBrandCountryLimits, {
    onSuccess: () => {
      showAlert.toast.success('Limits updated');
      setEditingCountryId(null);
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error updating limits: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeUpdateRate, status: updateRateStatus } = useAction(updateBrandCountryRate, {
    onSuccess: () => {
      showAlert.toast.success('Rates updated');
      refreshBrands();
    },
    onError: (e) => showAlert.toast.error('Error updating rates: ' + (e.error?.serverError || 'Unknown error')),
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
    const result = await getAllBrands();
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
    });
  };

  const handleUpdateLimits = (bc: BrandCountry) => {
    if (!selectedBrand) return;
    executeUpdateLimits({
      brandId: selectedBrand.id,
      countryId: bc.countryId,
      minAmount: countryLimits.minAmount ? parseFloat(countryLimits.minAmount) : null,
      maxAmount: countryLimits.maxAmount ? parseFloat(countryLimits.maxAmount) : null,
    });
    const bRate = countryLimits.buyRate ? parseFloat(countryLimits.buyRate) / 100 : 0.85;
    const sRate = countryLimits.sellRate ? parseFloat(countryLimits.sellRate) / 100 : 0.75;
    executeUpdateRate({
      brandCountryId: bc.id,
      buyRate: bRate,
      sellRate: sRate,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 md:flex-row">
      {/* Left Panel: Brands List */}
      <Card className="flex w-full shrink-0 flex-col overflow-hidden md:w-1/3 md:min-w-[320px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Brands</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Brand</DialogTitle>
                  <DialogDescription className="sr-only">Detalles de la nueva marca</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newBrand.name}
                      onChange={(e) => setNewBrand((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Amazon"
                    />
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
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBrand} disabled={createStatus === 'executing'}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input placeholder="Search brands..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="custom-scrollbar flex-1 space-y-2 overflow-y-auto">
          <AnimatePresence>
            {filteredBrands.map((brand) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
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
                  <div className="flex items-center gap-2">
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

      {/* Right Panel: Brand Details */}
      <Card className="w-full flex-1 md:w-auto">
        {selectedBrand ? (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
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
                  <div>
                    <CardTitle>{selectedBrand.name}</CardTitle>
                    <span className="text-muted-foreground text-sm">/{selectedBrand.slug}</span>
                  </div>
                </div>
                <div className="flex gap-2">
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
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Countries ({selectedBrand.countries.length})</h3>
                <Dialog open={isAddCountryDialogOpen} onOpenChange={setIsAddCountryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1" disabled={availableCountries.length === 0}>
                      <Plus className="h-4 w-4" /> Add Country
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Country to {selectedBrand.name}</DialogTitle>
                      <DialogDescription className="sr-only">Configuración del país a añadir</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddCountryDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddCountry} disabled={addCountryStatus === 'executing' || !newCountry.countryId}>
                        Add
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {selectedBrand.countries.map((bc) => (
                  <div
                    key={bc.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${bc.isActive ? 'border-border' : 'border-amber-500/30 bg-amber-500/5'}`}
                  >
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{bc.countryName}</span>
                        <span className="text-muted-foreground text-xs">({bc.countryCode})</span>
                        {!bc.isActive && (
                          <Badge variant="outline" className="border-amber-500 text-xs text-amber-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground block text-xs">
                        Limits: ${bc.minAmount ?? '—'} - ${bc.maxAmount ?? '—'} | Default Rates: Buy{' '}
                        {(bc.buyRate ? bc.buyRate * 100 : 85).toFixed(1)}% / Sell {(bc.sellRate ? bc.sellRate * 100 : 75).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {editingCountryId === bc.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[9px]">Min ($)</span>
                            <Input
                              type="number"
                              placeholder="Min"
                              value={countryLimits.minAmount}
                              onChange={(e) => setCountryLimits((p) => ({ ...p, minAmount: e.target.value }))}
                              className="h-8 w-16"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[9px]">Max ($)</span>
                            <Input
                              type="number"
                              placeholder="Max"
                              value={countryLimits.maxAmount}
                              onChange={(e) => setCountryLimits((p) => ({ ...p, maxAmount: e.target.value }))}
                              className="h-8 w-16"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[9px]">Buy Rate (%)</span>
                            <Input
                              type="number"
                              placeholder="Buy %"
                              value={countryLimits.buyRate}
                              onChange={(e) => setCountryLimits((p) => ({ ...p, buyRate: e.target.value }))}
                              className="h-8 w-20"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[9px]">Sell Rate (%)</span>
                            <Input
                              type="number"
                              placeholder="Sell %"
                              value={countryLimits.sellRate}
                              onChange={(e) => setCountryLimits((p) => ({ ...p, sellRate: e.target.value }))}
                              className="h-8 w-20"
                            />
                          </div>
                          <div className="mt-4 flex items-end gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateLimits(bc)}
                              disabled={updateLimitsStatus === 'executing' || updateRateStatus === 'executing'}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingCountryId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCountryId(bc.id);
                              setCountryLimits({
                                minAmount: bc.minAmount?.toString() || '',
                                maxAmount: bc.maxAmount?.toString() || '',
                                buyRate: (bc.buyRate ? bc.buyRate * 100 : 85).toString(),
                                sellRate: (bc.sellRate ? bc.sellRate * 100 : 75).toString(),
                              });
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={bc.isActive ? 'outline' : 'default'}
                            onClick={() =>
                              executeToggleCountry({ brandId: selectedBrand.id, countryId: bc.countryId, isActive: !bc.isActive })
                            }
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
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex h-full items-center justify-center">
            <div className="text-muted-foreground text-center">
              <Globe className="mx-auto h-12 w-12 opacity-30" />
              <p>Select a brand to view details</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
