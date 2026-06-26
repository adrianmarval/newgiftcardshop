'use client';

import { AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface AdvancedSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefMin: string;
  prefMax: string;
  prefBuyRate: string;
  savedMin: string;
  savedMax: string;
  allowSearchPreferences: boolean;
  allowBuyRateAdjustment: boolean;
  selectedBcExists: boolean;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  onBuyRateChange: (v: string) => void;
  onClear: () => void;
  onSave: () => void;
}

export function AdvancedSettingsSheet({
  open,
  onOpenChange,
  prefMin,
  prefMax,
  prefBuyRate,
  savedMin,
  savedMax,
  allowSearchPreferences,
  allowBuyRateAdjustment,
  selectedBcExists,
  onMinChange,
  onMaxChange,
  onBuyRateChange,
  onClear,
  onSave,
}: AdvancedSettingsSheetProps) {
  const hasSavedFilters = savedMin || savedMax;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-border bg-card/95 p-2 backdrop-blur-md">
        <SheetHeader className="p-0">
          <SheetTitle className="text-base font-semibold">Ajustes Avanzados</SheetTitle>
          <SheetDescription className="text-xs">Configura filtros personalizados y tu tarifa de compra</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {/* Buy Rate Adjustment */}
          {allowBuyRateAdjustment && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-xs font-medium" htmlFor="buy-rate">
                  Mi Tarifa de Compra (%)
                </Label>
                <span className="text-muted-foreground text-[10px]">80% - 100%</span>
              </div>
              {!selectedBcExists ? (
                <div className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Selecciona una marca primero para ajustar tu tarifa
                </div>
              ) : (
                <Input
                  id="buy-rate"
                  type="number"
                  placeholder="85"
                  min="80"
                  max="100"
                  step="0.1"
                  value={prefBuyRate}
                  onChange={(e) => onBuyRateChange(e.target.value)}
                  className="border-border bg-muted/50 h-9"
                />
              )}
            </div>
          )}

          {/* Min/Max Amount Filters */}
          {allowSearchPreferences && (
            <div className="space-y-1">
              <Label className="text-foreground text-xs font-medium">Rango de Montos</Label>
              <div className="grid grid-cols-2 gap-1">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px]">Mínimo ($)</span>
                  <Input
                    type="number"
                    placeholder="25"
                    value={prefMin}
                    onChange={(e) => onMinChange(e.target.value)}
                    className="border-border bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px]">Máximo ($)</span>
                  <Input
                    type="number"
                    placeholder="500"
                    value={prefMax}
                    onChange={(e) => onMaxChange(e.target.value)}
                    className="border-border bg-muted/50 h-9"
                  />
                </div>
              </div>
              {prefMin && prefMax && parseFloat(prefMin) > parseFloat(prefMax) && (
                <p className="text-destructive text-[10px]">El monto mínimo no puede ser mayor al máximo</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-1">
          <Button
            variant="outline"
            onClick={onClear}
            disabled={!hasSavedFilters && !prefBuyRate}
            className="border-border h-9 flex-1 text-xs"
          >
            Limpiar
          </Button>
          <Button onClick={onSave} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 flex-1 text-xs font-medium">
            Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
