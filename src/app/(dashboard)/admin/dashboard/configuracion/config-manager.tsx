'use client';

import React, { useState } from 'react';
import { PlatformSetting } from '@/types/platform/settings';
import { useAction } from 'next-safe-action/hooks';
import { setPlatformSetting, deletePlatformSetting } from '@/actions/platform/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconTrash, IconEdit, IconPlus } from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';

export function ConfigManager({ initialSettings }: { initialSettings: PlatformSetting[] }) {
  const [settings, setSettings] = useState<PlatformSetting[]>(initialSettings);

  // States para el modal de Crear/Editar
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<PlatformSetting | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '', description: '', balance: '' });

  // States para el alert de Eliminar
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const { executeAsync: executeSetSetting, status: setStatus } = useAction(setPlatformSetting);
  const { executeAsync: executeDeleteSetting, status: deleteStatus } = useAction(deletePlatformSetting);

  const handleOpenForm = (setting?: PlatformSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setFormData({
        key: setting.key,
        value: setting.value,
        description: setting.description || '',
        balance: setting.balance?.toString() || '0',
      });
    } else {
      setEditingSetting(null);
      setFormData({ key: '', value: '', description: '', balance: '' });
    }
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key || !formData.value) return;

    try {
      const result = await executeSetSetting({
        key: formData.key,
        value: formData.value,
        description: formData.description,
        ...(formData.balance !== '' && { balance: Number(formData.balance) }),
      });

      if (result?.data?.success) {
        setSettings((prev) => {
          const existingIndex = prev.findIndex((s) => s.key === formData.key);
          const newSetting = {
            id: editingSetting?.id || `temp-${Date.now()}`,
            key: formData.key,
            value: formData.value,
            description: formData.description || null,
            balance: formData.balance !== '' ? Number(formData.balance) : 0,
          };
          if (existingIndex >= 0) {
            const newSettings = [...prev];
            newSettings[existingIndex] = newSetting;
            return newSettings;
          }
          return [...prev, newSetting];
        });
        setIsFormOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAlert = (key: string) => {
    setDeletingKey(key);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingKey) return;
    try {
      const result = await executeDeleteSetting({ key: deletingKey });
      if (result?.data?.success) {
        setSettings((prev) => prev.filter((s) => s.key !== deletingKey));
        setIsAlertOpen(false);
        setDeletingKey(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Card className="m-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Configuraciones de la Plataforma</CardTitle>
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <IconPlus size={16} /> Nueva
          </Button>
        </CardHeader>
        <CardContent>
          {settings.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center">No hay configuraciones registradas.</div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="h-12 px-4 align-middle font-medium">Clave</th>
                    <th className="h-12 px-4 align-middle font-medium">Valor</th>
                    <th className="h-12 px-4 align-middle font-medium">Balance</th>
                    <th className="h-12 px-4 align-middle font-medium">Descripción</th>
                    <th className="h-12 w-[100px] px-4 align-middle font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {settings.map((setting) => (
                    <tr key={setting.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 align-middle font-medium">{setting.key}</td>
                      <td className="p-4 align-middle break-all">{setting.value}</td>
                      <td className="p-4 align-middle">{setting.balance !== undefined ? setting.balance : '-'}</td>
                      <td className="text-muted-foreground p-4 align-middle">{setting.description || '-'}</td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(setting)}>
                            <IconEdit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleOpenAlert(setting.key)}
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
        </CardContent>
      </Card>

      {/* Formulario Modal (Dialog) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>{editingSetting ? 'Editar Configuración' : 'Nueva Configuración'}</DialogTitle>
              <DialogDescription>
                {editingSetting
                  ? 'Modifica los valores de esta configuración.'
                  : 'Agrega un nuevo par clave-valor a las configuraciones globales del sistema.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key">Clave (Key)</Label>
                <Input
                  id="key"
                  required
                  disabled={!!editingSetting}
                  placeholder="Ej: MIN_BUY_AMOUNT"
                  value={formData.key}
                  onChange={(e) => setFormData((prev) => ({ ...prev, key: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor</Label>
                <Input
                  id="value"
                  required
                  placeholder="Ej: 10"
                  value={formData.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Descripción</Label>
                <Input
                  id="desc"
                  placeholder="Descripción opcional"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">
                  Balance <span className="text-muted-foreground font-normal">(Opcional)</span>
                </Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 1500.50"
                  value={formData.balance}
                  onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))}
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

      {/* Alerta de Eliminación */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la configuración <strong>{deletingKey}</strong>. Esto podría afectar el funcionamiento de la plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
            >
              {deleteStatus === 'executing' ? <Spinner size="sm" className="mr-2 text-white" /> : null}
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
