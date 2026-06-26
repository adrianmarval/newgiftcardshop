'use client';

import React, { useState } from 'react';
import { PlatformSetting } from '@/actions/platform';
import { useAction } from 'next-safe-action/hooks';
import { setPlatformSetting } from '@/actions/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconEdit } from '@tabler/icons-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { SETTING_KEYS, SETTING_DEFINITIONS, type SettingKey } from '@/lib/settings';
import { WhatsAppModal } from '@/components/admin/whatsapp';
import { MessageSquare, Loader2, Power, PowerOff } from 'lucide-react';
import { disconnectWhatsApp } from '@/actions/admin/whatsapp';
import { useRouter } from 'next/navigation';
import type { WhatsAppStatus } from '@/types';

const AUDIT_ONLY_KEYS: SettingKey[] = [SETTING_KEYS.PLATFORM_BALANCE];

interface ConfigManagerProps {
  initialSettings: PlatformSetting[];
  initialWhatsAppStatus: WhatsAppStatus;
}

export function ConfigManager({ initialSettings, initialWhatsAppStatus }: ConfigManagerProps) {
  const settingsMap = new Map(initialSettings.map((s) => [s.key, s]));
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>(initialWhatsAppStatus);
  const [editingKey, setEditingKey] = useState<SettingKey | null>(null);
  const [formData, setFormData] = useState({ value: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const { executeAsync: executeSetSetting, status: setStatus } = useAction(setPlatformSetting);
  const { execute: executeDisconnect, status: disconnectStatus } = useAction(disconnectWhatsApp, {
    onSuccess: () => {
      setWhatsappStatus({ status: 'disconnected', phoneNumber: null });
    },
  });

  const getDefinition = (key: SettingKey) => SETTING_DEFINITIONS[key];
  const isAuditOnly = (key: SettingKey) => AUDIT_ONLY_KEYS.includes(key);

  const getInputType = (key: SettingKey): 'text' | 'number' | 'boolean' => {
    const def = getDefinition(key);
    if (def?.type === 'boolean') return 'boolean';
    if (def?.type === 'number' || def?.type === 'decimal') return 'number';
    return 'text';
  };

  const validateValue = (key: SettingKey, value: string): string | null => {
    const def = getDefinition(key);
    if (!def) return 'Configuración desconocida';

    if (def.type === 'boolean') {
      if (value !== 'true' && value !== 'false') return 'El valor debe ser true o false';
    }

    if (def.type === 'number' || def.type === 'decimal') {
      const num = parseFloat(value);
      if (isNaN(num)) return 'Debe ser un número válido';
      if (def.validation?.min !== undefined && num < def.validation.min) {
        return `El valor debe ser mayor o igual a ${def.validation.min}`;
      }
      if (def.validation?.max !== undefined && num > def.validation.max) {
        return `El valor debe ser menor o igual a ${def.validation.max}`;
      }
    }

    if (def.type === 'string' && def.validation?.pattern && !def.validation.pattern.test(value)) {
      return 'El valor no cumple con el formato esperado';
    }

    return null;
  };

  const handleOpenForm = (key: SettingKey) => {
    setFormError(null);
    setEditingKey(key);
    const current = settingsMap.get(key);
    setFormData({
      value: current?.value ?? String(SETTING_DEFINITIONS[key].default),
      description: current?.description ?? '',
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey || !formData.value) return;

    const validationError = validateValue(editingKey, formData.value);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (isAuditOnly(editingKey)) {
      setFormError('Este setting es de solo lectura para auditoría');
      return;
    }

    try {
      const result = await executeSetSetting({
        key: editingKey,
        value: formData.value,
        description: formData.description,
      });

      if (result?.data?.success) {
        setIsFormOpen(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      setFormError('Error al guardar la configuración');
    }
  };

  const settingKeys = Object.values(SETTING_KEYS);
  const isWhatsAppConnected = whatsappStatus.status === 'open';

  return (
    <div className="w-full space-y-1">
      <h1 className="flex justify-center text-4xl font-black tracking-tighter italic md:text-5xl">CONFIGURACIÓN</h1>
      <div>
        {settingKeys.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center">No hay configuraciones definidas.</div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="h-12 px-4 align-middle font-medium">Clave</th>
                  <th className="h-12 px-4 align-middle font-medium">Valor</th>
                  <th className="h-12 px-4 align-middle font-medium">Tipo</th>
                  <th className="h-12 px-4 align-middle font-medium">Descripción</th>
                  <th className="h-12 w-25 px-4 align-middle font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {settingKeys.map((key) => {
                  const setting = settingsMap.get(key);
                  const def = getDefinition(key);
                  const isAudit = isAuditOnly(key);
                  const currentValue = setting?.value ?? String(def.default);

                  return (
                    <tr key={key} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 align-middle font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{key}</span>
                          {isAudit && <span className="text-xs font-medium text-orange-500">AUDIT</span>}
                        </div>
                      </td>
                      <td className="p-4 align-middle break-all">
                        {def.type === 'boolean' ? (
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${currentValue === 'true' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {currentValue}
                          </span>
                        ) : (
                          currentValue
                        )}
                      </td>
                      <td className="text-muted-foreground p-4 align-middle">{def.type}</td>
                      <td className="text-muted-foreground p-4 align-middle">{def.description}</td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-1">
                          {!isAudit && (
                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(key)}>
                              <IconEdit size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── WhatsApp Channel ── */}
      <div className="mt-6">
        <div className="overflow-hidden rounded-md border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className={`h-5 w-5 ${isWhatsAppConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium">Canal de Notificaciones WhatsApp</p>
                <p className="text-muted-foreground text-sm">
                  {isWhatsAppConnected ? `Conectado · ${whatsappStatus.phoneNumber}` : 'No configurado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isWhatsAppConnected ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => executeDisconnect()}
                  disabled={disconnectStatus === 'executing'}
                  className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                  title="Desconectar"
                >
                  {disconnectStatus === 'executing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsWhatsAppOpen(true)}
                  className="h-8 w-8 text-green-500 hover:bg-green-500/10 hover:text-green-600"
                  title="Vincular"
                >
                  <Power className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <WhatsAppModal open={isWhatsAppOpen} onOpenChange={setIsWhatsAppOpen} onStatusChange={setWhatsappStatus} />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>Editar {editingKey}</DialogTitle>
              <DialogDescription>Modifica el valor de esta configuración.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1 py-4">
              <div className="space-y-1">
                <Label>Valor</Label>
                <Input
                  required
                  placeholder={
                    editingKey
                      ? getInputType(editingKey) === 'boolean'
                        ? 'true o false'
                        : getInputType(editingKey) === 'number'
                          ? 'Ej: 10'
                          : 'Ej: texto'
                      : ''
                  }
                  type={editingKey && getInputType(editingKey) === 'number' ? 'number' : 'text'}
                  step={editingKey && getInputType(editingKey) === 'number' ? '1' : undefined}
                  value={formData.value}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, value: e.target.value }));
                    setFormError(null);
                  }}
                />
                {editingKey && getInputType(editingKey) === 'boolean' && (
                  <p className="text-muted-foreground text-xs">Usa &quot;true&quot; o &quot;false&quot;</p>
                )}
                {editingKey && getDefinition(editingKey)?.validation?.min !== undefined && (
                  <p className="text-muted-foreground text-xs">
                    Rango: {getDefinition(editingKey)?.validation?.min} - {getDefinition(editingKey)?.validation?.max}
                  </p>
                )}
              </div>
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Input
                  placeholder="Descripción opcional"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={setStatus === 'executing'}>
                {setStatus === 'executing' ? <Spinner size="sm" className="mr-2" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
