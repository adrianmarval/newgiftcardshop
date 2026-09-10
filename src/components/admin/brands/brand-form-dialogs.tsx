'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import { useIsMobile } from '@/hooks/use-mobile';
import { createBrand, addCountryToBrand, updateBrandCountryLimits } from '@/actions/admin/catalog';
import type { BrandWithCountries, BrandCountrySummary, Country } from '@/types';

interface BrandFormDialogsProps {
  isCreateOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  isAddCountryOpen: boolean;
  onAddCountryOpenChange: (open: boolean) => void;
  editingCountry: BrandCountrySummary | null;
  onEditingCountryChange: (bc: BrandCountrySummary | null) => void;
  selectedBrand: BrandWithCountries | null;
  availableCountries: Country[];
  /** Refrescar la lista de brands tras una mutación. */
  onChanged: () => void;
}

export function BrandFormDialogs({
  isCreateOpen,
  onCreateOpenChange,
  isAddCountryOpen,
  onAddCountryOpenChange,
  editingCountry,
  onEditingCountryChange,
  selectedBrand,
  availableCountries,
  onChanged,
}: BrandFormDialogsProps) {
  const isMobile = useIsMobile();
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
      onCreateOpenChange(false);
      setNewBrand({ name: '', slug: '', icon: '📦', image: '' });
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error creating brand: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeAddCountry, status: addCountryStatus } = useAction(addCountryToBrand, {
    onSuccess: () => {
      showAlert.toast.success('Country added');
      onAddCountryOpenChange(false);
      setNewCountry({ countryId: '', minAmount: '', maxAmount: '', claimCodePattern: '' });
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error adding country: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeUpdateLimits, status: updateLimitsStatus } = useAction(updateBrandCountryLimits, {
    onSuccess: () => {
      showAlert.toast.success('Limits updated');
      onEditingCountryChange(null);
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error updating limits: ' + (e.error?.serverError || 'Unknown error')),
  });

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

  // Inicializar el form de límites cuando cambia el país en edición
  const [lastEditingId, setLastEditingId] = useState<string | null>(null);
  if (editingCountry && editingCountry.id !== lastEditingId) {
    setLastEditingId(editingCountry.id);
    setCountryLimits({
      minAmount: editingCountry.minAmount?.toString() || '',
      maxAmount: editingCountry.maxAmount?.toString() || '',
      claimCodePattern: editingCountry.claimCodePattern || '',
      stockReminderInterval: editingCountry.stockReminderIntervalMinutes?.toString() || '',
    });
  } else if (!editingCountry && lastEditingId) {
    setLastEditingId(null);
  }

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

  return (
    <>
      {/* Create Brand */}
      <FormRoot open={isCreateOpen} onOpenChange={onCreateOpenChange}>
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
            <Button variant="outline" onClick={() => onCreateOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBrand} disabled={createStatus === 'executing'}>
              Create
            </Button>
          </FormFooter>
        </FormContent>
      </FormRoot>

      {/* Add Country */}
      <FormRoot open={isAddCountryOpen} onOpenChange={onAddCountryOpenChange}>
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
            <Button variant="outline" onClick={() => onAddCountryOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCountry} disabled={addCountryStatus === 'executing' || !newCountry.countryId}>
              Add
            </Button>
          </FormFooter>
        </FormContent>
      </FormRoot>

      {/* Edit Country Limits */}
      <FormRoot open={!!editingCountry} onOpenChange={(open) => !open && onEditingCountryChange(null)}>
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
            <Button variant="outline" onClick={() => onEditingCountryChange(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLimits} disabled={updateLimitsStatus === 'executing'}>
              Save
            </Button>
          </FormFooter>
        </FormContent>
      </FormRoot>
    </>
  );
}
