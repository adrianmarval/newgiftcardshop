'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

interface SearchPreferencesFormProps {
  minAmount?: number | null;
  maxAmount?: number | null;
  onSave: (preferences: { minAmount: number | null; maxAmount: number | null }) => void | Promise<void>;
  disabled?: boolean;
}

export function SearchPreferencesForm({ minAmount, maxAmount, onSave, disabled = false }: SearchPreferencesFormProps) {
  const [min, setMin] = useState(minAmount?.toString() || '');
  const [max, setMax] = useState(maxAmount?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleClear = () => {
    setMin('');
    setMax('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const minVal = min ? parseFloat(min) : null;
      const maxVal = max ? parseFloat(max) : null;

      if (minVal !== null && maxVal !== null && minVal > maxVal) {
        toast.error('El monto mínimo no puede ser mayor al máximo');
        return;
      }

      if (minVal === null && maxVal === null) {
        toast.error('Configura al menos una preferencia');
        return;
      }

      await onSave({
        minAmount: minVal,
        maxAmount: maxVal,
      });
      toast.success('Preferencias guardadas');
    } catch (error) {
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={handleClear} disabled={disabled || saving} className="text-muted-foreground h-6 text-xs">
        Limpiar todo
      </Button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minAmount">Monto Mínimo</Label>
          <Input
            id="minAmount"
            type="number"
            placeholder=" ej: 25"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            disabled={disabled || saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxAmount">Monto Máximo</Label>
          <Input
            id="maxAmount"
            type="number"
            placeholder=" ej: 500"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            disabled={disabled || saving}
          />
        </div>
      </div>



      <Button onClick={handleSave} disabled={disabled || saving} className="w-full">
        {saving ? 'Guardando...' : 'Guardar Preferencias'}
      </Button>
    </div>
  );
}
