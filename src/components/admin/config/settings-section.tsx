'use client';

import React, { useMemo, useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { showAlert } from '@/lib/ui';
import {
  SETTING_GROUPS,
  getSettingsByGroup,
  serializeSettingValue,
  validateSettingValue,
  type SettingGroupId,
  type SettingKey,
} from '@/lib/settings';
import { updateSettingsGroup } from '@/actions/platform';
import { SettingField } from './setting-field';

interface SettingsSectionProps {
  groupId: SettingGroupId;
  initialValues: Record<string, unknown>;
}

export function SettingsSection({ groupId, initialValues }: SettingsSectionProps) {
  const group = SETTING_GROUPS[groupId];
  const definitions = useMemo(
    () => getSettingsByGroup(groupId).filter((d) => !d.auditOnly && d.editable !== false),
    [groupId],
  );

  const baseline = useMemo(() => {
    const base = {} as Record<SettingKey, unknown>;
    for (const def of definitions) {
      base[def.key] = initialValues[def.key] ?? def.default;
    }
    return base;
  }, [definitions, initialValues]);

  const [savedValues, setSavedValues] = useState<Record<SettingKey, unknown>>(baseline);
  const [draft, setDraft] = useState<Record<SettingKey, unknown>>(baseline);
  const [errors, setErrors] = useState<Partial<Record<SettingKey, string>>>({});

  // Sync si el server entrega nuevos initialValues (navegación full, etc.)
  React.useEffect(() => {
    setSavedValues(baseline);
    setDraft(baseline);
    setErrors({});
  }, [baseline]);

  const { executeAsync, status } = useAction(updateSettingsGroup);
  const isSaving = status === 'executing';

  const dirtyKeys = definitions.filter(
    (def) => serializeSettingValue(def.key, draft[def.key]) !== serializeSettingValue(def.key, savedValues[def.key]),
  );
  const isDirty = dirtyKeys.length > 0;

  const handleChange = (key: SettingKey, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleReset = () => {
    setDraft(savedValues);
    setErrors({});
  };

  const handleSave = async () => {
    // Pre-validación con el mismo registry del servidor
    const newErrors: Partial<Record<SettingKey, string>> = {};
    for (const def of dirtyKeys) {
      const result = validateSettingValue(def.key, draft[def.key]);
      if (!result.valid) newErrors[def.key] = result.error ?? 'Valor inválido';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Confirmación para settings de riesgo
    const dangerousDirty = dirtyKeys.filter((def) => def.dangerous);
    if (dangerousDirty.length > 0) {
      const names = dangerousDirty.map((def) => def.label).join(', ');
      const confirmed = await showAlert.confirm(
        'Confirmar cambio de riesgo',
        `Estás por modificar: ${names}. Esto afecta el flujo de dinero de la plataforma. ¿Continuar?`,
        { confirmText: 'Sí, aplicar', cancelText: 'Cancelar', danger: true },
      );
      if (!confirmed) return;
    }

    const values: Record<string, unknown> = {};
    for (const def of dirtyKeys) {
      values[def.key] = draft[def.key];
    }

    try {
      const result = await executeAsync({ group: groupId, values });

      if (result?.serverError) {
        showAlert.toast.error('Error al guardar', result.serverError);
        return;
      }
      if (result?.validationErrors) {
        showAlert.toast.error('Error de validación', 'Revisa los valores ingresados.');
        return;
      }
      if (result?.data?.success) {
        setSavedValues((prev) => ({ ...prev, ...values }));
        showAlert.toast.success('Configuración guardada', group.title);
        // Sin router.refresh(): savedValues ya actualiza la UI local y un
        // refresh post-mutación puede abortar una navegación en vuelo.
      }
    } catch {
      showAlert.toast.error('Error inesperado', 'No se pudo guardar la configuración.');
    }
  };

  if (definitions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{group.title}</CardTitle>
        <CardDescription>{group.description}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {definitions.map((def) => (
          <SettingField
            key={def.key}
            definition={def}
            value={draft[def.key]}
            onChange={(value) => handleChange(def.key, value)}
            error={errors[def.key]}
            disabled={isSaving}
          />
        ))}
      </CardContent>
      {isDirty && (
        <>
          <Separator />
          <CardFooter className="justify-end gap-2 py-4">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isSaving}>
              Restablecer
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Spinner size="sm" className="mr-2" />}
              Guardar cambios
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
