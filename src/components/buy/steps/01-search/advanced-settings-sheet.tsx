'use client';

import { ComponentType, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const hasSavedFilters = savedMin || savedMax;

  const Container: ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; children?: ReactNode }> = isMobile
    ? Drawer
    : Dialog;
  const Content: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerContent : DialogContent;
  const Header: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerHeader : DialogHeader;
  const Title: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerTitle : DialogTitle;
  const Description: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerDescription : DialogDescription;
  const Footer: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerFooter : DialogFooter;

  return (
    <Container open={open} onOpenChange={onOpenChange}>
      <Content className="border-border bg-card/95 p-5 backdrop-blur-md sm:max-w-md sm:p-6">
        <Header className="mb-5 p-0 text-left sm:text-center">
          <Title className="text-xl font-semibold">Ajustes Avanzados</Title>
          <Description className="mt-1 text-sm">Configura aqui tu tarifa de compra y denominacion de tarjetas que desees</Description>
        </Header>

        <div className="space-y-6">
          {/* Buy Rate Adjustment */}
          {allowBuyRateAdjustment && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-sm font-medium" htmlFor="buy-rate">
                  Tarifa de Compra (%)
                </Label>
                <span className="text-muted-foreground text-xs font-medium">Rango Permitido (80% - 100%)</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Define la tarifa máxima que estás dispuesto a pagar por una tarjeta de esta marca.
              </p>
              {!selectedBcExists ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
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
                  className="border-border bg-muted/50 h-11 text-base"
                />
              )}
            </div>
          )}

          {/* Min/Max Amount Filters */}
          {allowSearchPreferences && (
            <div className="space-y-3">
              <Label className="text-foreground text-sm font-medium">Rango de Montos</Label>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Filtra las tarjetas disponibles para mostrar solo las que estén dentro del rango de monto especificado.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Mínimo ($)</span>
                  <Input
                    type="number"
                    placeholder="25"
                    value={prefMin}
                    onChange={(e) => onMinChange(e.target.value)}
                    className="border-border bg-muted/50 h-11 text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Máximo ($)</span>
                  <Input
                    type="number"
                    placeholder="500"
                    value={prefMax}
                    onChange={(e) => onMaxChange(e.target.value)}
                    className="border-border bg-muted/50 h-11 text-base"
                  />
                </div>
              </div>
              {prefMin && prefMax && parseFloat(prefMin) > parseFloat(prefMax) && (
                <p className="text-destructive text-xs font-medium">El monto mínimo no puede ser mayor al máximo</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <Footer className="flex-row items-center gap-3 px-0 pt-6 pb-0">
          <Button
            variant="outline"
            onClick={onClear}
            disabled={!hasSavedFilters && !prefBuyRate}
            className="border-border h-11 flex-1 text-sm"
          >
            Limpiar
          </Button>
          <Button onClick={onSave} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 flex-1 text-sm font-medium">
            Guardar
          </Button>
        </Footer>
      </Content>
    </Container>
  );
}
