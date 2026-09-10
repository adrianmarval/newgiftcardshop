'use client';

import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit2, Globe } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import Image from 'next/image';
import { deleteBrand, removeCountryFromBrand, toggleBrandActive, toggleBrandCountryActive } from '@/actions/admin/catalog';
import type { BrandWithCountries, BrandCountrySummary } from '@/types';

interface BrandDetailProps {
  brand: BrandWithCountries;
  /** Abrir el dialog de agregar país (deshabilitado si no hay países disponibles). */
  canAddCountry: boolean;
  onAddCountry: () => void;
  onEditCountry: (bc: BrandCountrySummary) => void;
  /** Refrescar la lista de brands tras una mutación. */
  onChanged: () => void;
  /** Limpiar la selección (tras borrar el brand). */
  onDeleted: () => void;
}

export function BrandDetail({ brand: selectedBrand, canAddCountry, onAddCountry, onEditCountry, onChanged, onDeleted }: BrandDetailProps) {
  const { execute: executeDelete, status: deleteStatus } = useAction(deleteBrand, {
    onSuccess: () => {
      showAlert.toast.success('Brand deleted');
      onDeleted();
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error deleting brand: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeRemoveCountry, status: removeCountryStatus } = useAction(removeCountryFromBrand, {
    onSuccess: () => {
      showAlert.toast.success('Country removed');
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error removing country: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeToggleBrand, status: toggleBrandStatus } = useAction(toggleBrandActive, {
    onSuccess: () => onChanged(),
    onError: (e) => showAlert.toast.error('Error toggling brand: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeToggleCountry, status: toggleCountryStatus } = useAction(toggleBrandCountryActive, {
    onSuccess: () => onChanged(),
    onError: (e) => showAlert.toast.error('Error toggling country: ' + (e.error?.serverError || 'Unknown error')),
  });

  return (
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
        <Button size="sm" className="gap-1" disabled={!canAddCountry} onClick={onAddCountry}>
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
              <Button size="sm" variant="outline" onClick={() => onEditCountry(bc)}>
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
  );
}
