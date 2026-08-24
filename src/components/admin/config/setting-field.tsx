'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/ui';
import type { SettingDefinition } from '@/lib/settings';

interface SettingFieldProps {
  definition: SettingDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export function SettingField({ definition, value, onChange, error, disabled }: SettingFieldProps) {
  const { key, label, description, input, unit, step, validation, dangerous } = definition;

  const labelWithBadge = (
    <span className="flex items-center gap-2">
      {label}
      {dangerous && (
        <Badge variant="outline" className="border-orange-500/50 text-[10px] font-medium text-orange-500">
          Riesgo
        </Badge>
      )}
    </span>
  );

  if (input === 'switch') {
    return (
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="space-y-0.5">
          <Label htmlFor={key} className="text-sm font-medium">
            {labelWithBadge}
          </Label>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Switch id={key} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} disabled={disabled} />
      </div>
    );
  }

  const rangeHint =
    validation?.min !== undefined && validation?.max !== undefined ? `Entre ${validation.min} y ${validation.max}` : undefined;

  return (
    <div className="space-y-1.5 py-1">
      <Label htmlFor={key} className="text-sm font-medium">
        {labelWithBadge}
      </Label>
      <p className="text-muted-foreground text-sm">{description}</p>
      <div className="flex items-center gap-2">
        <Input
          id={key}
          type={input === 'number' ? 'number' : 'text'}
          inputMode={input === 'number' ? 'numeric' : undefined}
          min={input === 'number' ? validation?.min : undefined}
          max={input === 'number' ? validation?.max : undefined}
          step={input === 'number' ? (step ?? 1) : undefined}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (input === 'number') {
              const parsed = parseFloat(raw);
              onChange(raw === '' || isNaN(parsed) ? raw : parsed);
            } else {
              onChange(raw);
            }
          }}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn('max-w-xs', unit && 'rounded-r-none')}
        />
        {unit && (
          <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-r-md border border-l-0 px-3 text-sm">
            {unit}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        (rangeHint || (validation?.pattern && 'Solo dígitos')) && <p className="text-muted-foreground text-xs">{rangeHint ?? 'Solo dígitos'}</p>
      )}
    </div>
  );
}
