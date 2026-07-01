'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { IconPlus, IconEdit, IconTrash, IconCheck, IconPlayerPlay } from '@tabler/icons-react';
import {
  listAIProviders,
  createAIProvider,
  updateAIProvider,
  deleteAIProvider,
  setActiveAIProvider,
  testAIProvider,
} from '@/actions/admin/ai-providers';
import type { AIProviderConfigResponse } from '@/lib/ai-provider-config';
import { showAlert } from '@/lib/ui';

interface AIProvidersManagerProps {
  initialProviders: AIProviderConfigResponse[];
}

export function AIProvidersManager({ initialProviders }: AIProvidersManagerProps) {
  const [providers, setProviders] = useState<AIProviderConfigResponse[]>(initialProviders);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderConfigResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: '',
    label: '',
    model: '',
    baseUrl: '',
    apiKey: '',
    isDefault: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const refreshProviders = async () => {
    const result = await listAIProviders();
    if (result?.data) {
      setProviders(result.data as AIProviderConfigResponse[]);
    }
  };

  const handleOpenForm = (provider?: AIProviderConfigResponse) => {
    setFormError(null);
    setEditingProvider(provider ?? null);
    if (provider) {
      setFormData({
        name: provider.name,
        label: provider.label,
        model: provider.model,
        baseUrl: provider.baseUrl ?? '',
        apiKey: '',
        isDefault: provider.isDefault,
      });
    } else {
      setFormData({ name: '', label: '', model: '', baseUrl: '', apiKey: '', isDefault: false });
    }
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.label || !formData.model) {
      setFormError('Nombre, etiqueta y modelo son requeridos');
      return;
    }

    if (!editingProvider && !formData.apiKey) {
      setFormError('API Key es requerida');
      return;
    }

    if (editingProvider) {
      const result = await updateAIProvider({
        id: editingProvider.id,
        name: formData.name,
        label: formData.label,
        model: formData.model,
        baseUrl: formData.baseUrl || null,
        ...(formData.apiKey ? { apiKey: formData.apiKey } : {}),
        isDefault: formData.isDefault,
      });
      if (result?.data) {
        setIsFormOpen(false);
        refreshProviders();
      } else {
        setFormError('Error al actualizar el provider');
      }
    } else {
      const result = await createAIProvider({
        name: formData.name,
        label: formData.label,
        model: formData.model,
        baseUrl: formData.baseUrl || null,
        apiKey: formData.apiKey,
        isDefault: formData.isDefault,
      });
      if (result?.data) {
        setIsFormOpen(false);
        refreshProviders();
      } else {
        setFormError('Error al crear el provider');
      }
    }
  };

  const handleSetActive = async (id: string) => {
    startTransition(async () => {
      await setActiveAIProvider({ id });
      refreshProviders();
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este provider?')) return;
    startTransition(async () => {
      await deleteAIProvider({ id });
      refreshProviders();
    });
  };

  const handleTest = async (id: string) => {
    startTransition(async () => {
      const result = await testAIProvider({ id });
      if (result?.data) {
        showAlert.info(`Test exitoso con modelo ${result.data.model}`);
      } else {
        showAlert.error(`Test falló — verifica la API key y el modelo`);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Vision Provider</h2>
          <p className="text-muted-foreground text-sm">Proveedor de IA para extracción de gift cards desde imágenes</p>
        </div>
        <Button size="sm" onClick={() => handleOpenForm()}>
          <IconPlus size={16} className="mr-1" />
          Agregar
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="text-muted-foreground rounded-md border p-8 text-center">
          No hay providers configurados. Agrega uno para habilitar OCR.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="h-12 px-4 align-middle font-medium">Proveedor</th>
                <th className="h-12 px-4 align-middle font-medium">Modelo</th>
                <th className="h-12 px-4 align-middle font-medium">API Key</th>
                <th className="h-12 px-4 align-middle font-medium">Estado</th>
                <th className="h-12 px-4 align-middle font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {providers.map((p) => (
                <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4 align-middle">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground text-xs">{p.baseUrl || 'OpenAI default'}</span>
                    </div>
                  </td>
                  <td className="p-4 align-middle font-mono text-xs">{p.model}</td>
                  <td className="text-muted-foreground p-4 align-middle font-mono text-xs">{p.apiKeyMasked}</td>
                  <td className="p-4 align-middle">
                    <div className="flex gap-1">
                      {p.isActive && <Badge className="bg-green-100 text-green-800">Activo</Badge>}
                      {p.isDefault && !p.isActive && <Badge variant="outline">Default</Badge>}
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex gap-1">
                      {!p.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                          onClick={() => handleSetActive(p.id)}
                          disabled={isPending}
                          title="Activar"
                        >
                          <IconCheck size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTest(p.id)}
                        disabled={isPending}
                        title="Test conexión"
                      >
                        <IconPlayerPlay size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(p)} title="Editar">
                        <IconEdit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                        title="Eliminar"
                      >
                        <IconTrash size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>{editingProvider ? 'Editar Provider' : 'Nuevo Provider'}</DialogTitle>
              <DialogDescription>
                {editingProvider ? 'Modifica la configuración del provider.' : 'Agrega un nuevo proveedor de IA para OCR.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nombre *</Label>
                  <Input
                    required
                    placeholder="minimax"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Etiqueta *</Label>
                  <Input
                    required
                    placeholder="MiniMax M3"
                    value={formData.label}
                    onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Modelo *</Label>
                <Input
                  required
                  placeholder="MiniMax-M3"
                  value={formData.model}
                  onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Base URL</Label>
                <Input
                  placeholder="https://api.minimax.chat/v1 (opcional para OpenAI default)"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>API Key {editingProvider ? '(dejar vacío para mantener)' : '*'}</Label>
                <Input
                  type="password"
                  required={!editingProvider}
                  placeholder="sk-..."
                  value={formData.apiKey}
                  onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="isDefault">Provider por defecto</Label>
              </div>
              {formError && <p className="text-destructive text-sm">{formError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" className="mr-2" /> : null}
                {editingProvider ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
