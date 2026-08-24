'use client';

import { useState, useEffect, startTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FiltersBar } from '@/components/common';
import { cn } from '@/lib/ui';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import { updateUser, getUserRates, updateUserRates, deleteUserRates, unlinkTelegram, getAdminTelegramPhoto } from '@/actions/admin/users/';
import { listBrands } from '@/actions/admin/catalog';
import { UrlPagination } from '@/components/ui/url-pagination';
import { adminUsersSearchParamsParsers } from '@/lib/search-params';
import { MoreVertical, Edit2, Power, Loader2, ChevronsUpDown, Check, Link2Off } from 'lucide-react';
import type { BrandCountrySummary, BrandWithCountries } from '@/types';
import type { User, UserRate } from '@/types';

interface UsersManagerProps {
  initialUsers: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

export function UsersManager({ initialUsers, pagination }: UsersManagerProps) {
  const router = useRouter();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    role: '',
    creditLimit: '',
    minAmount: '',
    maxAmount: '',
    allowSearchPreferences: false,
    allowBuyRateAdjustment: false,
  });

  const [userRates, setUserRates] = useState<UserRate[]>([]);
  const [brands, setBrands] = useState<BrandWithCountries[]>([]);
  const [selectedBrandCountryId, setSelectedBrandCountryId] = useState('');
  const [openBrandCountry, setOpenBrandCountry] = useState(false);
  const [rateForm, setRateForm] = useState({ buyRate: '', sellRate: '' });
  const [unlinkTarget, setUnlinkTarget] = useState<User | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const fetchPhoto = useCallback(async (userId: string) => {
    if (photoUrls[userId]) return;
    const res = await getAdminTelegramPhoto({ userId });
    if (res?.data?.success) {
      const url = res.data.dataUrl;
      setPhotoUrls((prev) => {
        const next = { ...prev } as Record<string, string>;
        next[userId] = url;
        return next;
      });
    }
  }, [photoUrls]);

  useEffect(() => {
    for (const user of initialUsers) {
      if (user.telegramUser?.hasPhoto) {
        fetchPhoto(user.id);
      }
    }
  }, [initialUsers, fetchPhoto]);

  const { execute: executeUpdate, status: updateStatus } = useAction(updateUser, {
    onSuccess: () => {
      showAlert.toast.success('Usuario actualizado');
      router.refresh();
      setEditUser(null);
    },
    onError: (e) => showAlert.toast.error('Error actualizando usuario: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeToggle, status: toggleStatus } = useAction(updateUser, {
    onSuccess: () => {
      showAlert.toast.success('Estado actualizado');
      router.refresh();
    },
    onError: (e) => showAlert.toast.error('Error actualizando usuario: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeUnlink, status: unlinkStatus } = useAction(unlinkTelegram, {
    onSuccess: () => {
      showAlert.toast.success('Telegram desvinculado');
      router.refresh();
      setUnlinkTarget(null);
    },
    onError: (e) => showAlert.toast.error('Error desvinculando: ' + (e.error?.serverError || 'Unknown error')),
  });

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setEditForm({
      role: user.role,
      creditLimit: user.creditLimit.toString(),
      minAmount: user.minAmountPreference?.toString() || '',
      maxAmount: user.maxAmountPreference?.toString() || '',
      allowSearchPreferences: user.allowSearchPreferences,
      allowBuyRateAdjustment: user.allowBuyRateAdjustment,
    });
  };

  useEffect(() => {
    if (!editUser) {
      // Wrap setState in startTransition to avoid cascading renders warning
      startTransition(() => {
        setUserRates([]);
        setSelectedBrandCountryId('');
        setRateForm({ buyRate: '', sellRate: '' });
      });
      return;
    }

    // Use async IIFE to avoid synchronous setState in effect body
    (async () => {
      const [ratesRes, brandsRes] = await Promise.all([getUserRates({ userId: editUser.id }), listBrands()]);

      startTransition(() => {
        if (ratesRes?.data?.success) {
          setUserRates(ratesRes.data.rates);
        }
        if (brandsRes?.data?.success) {
          setBrands(brandsRes.data.brands);
        }
      });
    })();
  }, [editUser]);

  const handleAddRate = async () => {
    if (!editUser || !selectedBrandCountryId) return;

    const isSeller = editUser.role === 'SELLER';
    const isBuyer = editUser.role === 'BUYER';

    if (isBuyer && !rateForm.buyRate) {
      showAlert.toast.error('Complete el campo Buy Rate');
      return;
    }
    if (isSeller && !rateForm.sellRate) {
      showAlert.toast.error('Complete el campo Sell Rate');
      return;
    }

    const buyVal = isBuyer ? parseFloat(rateForm.buyRate) / 100 : 0;
    const sellVal = isSeller ? parseFloat(rateForm.sellRate) / 100 : 0;

    if (isBuyer && (isNaN(buyVal) || buyVal < 0 || buyVal > 1)) {
      showAlert.toast.error('Buy Rate debe estar entre 0% y 100%');
      return;
    }
    if (isSeller && (isNaN(sellVal) || sellVal < 0 || sellVal > 1)) {
      showAlert.toast.error('Sell Rate debe estar entre 0% y 100%');
      return;
    }

    const res = await updateUserRates({
      userId: editUser.id,
      brandCountryId: selectedBrandCountryId,
      buyRate: buyVal,
      sellRate: sellVal,
    });

    if (res?.data?.success) {
      showAlert.toast.success('Tarifa guardada');
      const ratesRes = await getUserRates({ userId: editUser.id });
      if (ratesRes?.data?.success) {
        setUserRates(ratesRes.data.rates);
      }
      setSelectedBrandCountryId('');
      setRateForm({ buyRate: '', sellRate: '' });
    } else {
      showAlert.toast.error('Error al guardar tarifa');
    }
  };

  const handleDeleteRate = async (brandCountryId: string) => {
    if (!editUser) return;

    const res = await deleteUserRates({
      userId: editUser.id,
      brandCountryId,
    });

    if (res?.data?.success) {
      showAlert.toast.success('Tarifa eliminada');
      const ratesRes = await getUserRates({ userId: editUser.id });
      if (ratesRes?.data?.success) {
        setUserRates(ratesRes.data.rates);
      }
    } else {
      showAlert.toast.error('Error al eliminar tarifa');
    }
  };

  const brandCountryOptions = brands.flatMap((b) =>
    b.countries.map((c: BrandCountrySummary) => ({
      id: c.id,
      label: `${b.icon} ${b.name} (${c.countryCode})`,
    })),
  );

  const handleSaveEdit = () => {
    if (!editUser) return;
    executeUpdate({
      userId: editUser.id,
      role: editForm.role as 'ADMIN' | 'SELLER' | 'BUYER',
      creditLimit: editForm.creditLimit ? parseFloat(editForm.creditLimit) : undefined,
      minAmountPreference: editForm.minAmount ? parseFloat(editForm.minAmount) : null,
      maxAmountPreference: editForm.maxAmount ? parseFloat(editForm.maxAmount) : null,
      allowSearchPreferences: editForm.allowSearchPreferences,
      allowBuyRateAdjustment: editForm.allowBuyRateAdjustment,
    });
  };

  const isUpdating = updateStatus === 'executing' || toggleStatus === 'executing';

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminUsersSearchParamsParsers}
        defaults={{ search: '', role: 'ALL' }}
        config={{
          search: { placeholder: 'Buscar por nombre o email...', paramKey: 'search' },
          status: {
            label: 'Rol',
            paramKey: 'role',
            options: [
              { value: 'ALL', label: 'Todos' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SELLER', label: 'Seller' },
              { value: 'BUYER', label: 'Buyer' },
            ],
          },
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar">
        {initialUsers.map((user) => (
          <Card key={user.id} className="hover:border-primary/30 overflow-visible transition-all duration-200 ease-out">
            <CardContent className="flex items-center gap-3 py-3">
              {user.telegramUser?.hasPhoto && photoUrls[user.id] ? (
                <img
                  src={photoUrls[user.id]}
                  alt={user.name}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : user.telegramUser ? (
                <div className="bg-sky-500/10 text-sky-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                  {(user.telegramUser.firstName || user.name).charAt(0).toUpperCase()}
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-base">{user.name}</span>
                  {!user.isActive && (
                    <Badge variant="destructive" className="shrink-0 text-xs">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                {user.telegramUser ? (
                  <a
                    href={`https://t.me/${user.telegramUser.username || user.telegramUser.telegramId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-sky-500 flex items-center gap-1.5 text-sm transition-colors"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                    @{user.telegramUser.username || user.telegramUser.firstName || user.telegramUser.telegramId}
                  </a>
                ) : (
                  <p className="text-muted-foreground/60 text-sm">Sin Telegram</p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0">
                {user.role}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(user)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => executeToggle({ userId: user.id, isActive: !user.isActive })}
                    className="text-destructive focus:text-destructive"
                  >
                    <Power className="mr-2 h-4 w-4" />
                    {user.isActive ? 'Desactivar' : 'Activar'}
                  </DropdownMenuItem>
                  {user.telegramUser && (
                    <DropdownMenuItem
                      onClick={() => setUnlinkTarget(user)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Link2Off className="mr-2 h-4 w-4" />
                      Desvincular Telegram
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}

        {initialUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No se encontraron usuarios.</p>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <UrlPagination totalPages={pagination.totalPages} />
      </div>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-106.25 md:max-w-125">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1 py-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Rol</label>
              <Select value={editForm.role} onValueChange={(role) => setEditForm((f) => ({ ...f, role }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SELLER">Seller</SelectItem>
                  <SelectItem value="BUYER">Buyer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.role === 'BUYER' && (
              <div className="grid gap-1">
                <label className="text-sm font-medium">Límite de Crédito ($)</label>
                <Input
                  type="number"
                  value={editForm.creditLimit}
                  onChange={(e) => setEditForm((f) => ({ ...f, creditLimit: e.target.value }))}
                />
              </div>
            )}

            {editForm.role === 'BUYER' && (
              <div className="grid grid-cols-2 gap-1">
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Min. Denominación ($)</label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={editForm.minAmount}
                    onChange={(e) => setEditForm((f) => ({ ...f, minAmount: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Max. Denominación ($)</label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={editForm.maxAmount}
                    onChange={(e) => setEditForm((f) => ({ ...f, maxAmount: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {editForm.role === 'BUYER' && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Filtros de Búsqueda</label>
                  <p className="text-muted-foreground text-xs">Permite al usuario configurar filtros de denominación mínima y máxima.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editForm.allowSearchPreferences}
                    onChange={(e) => setEditForm((f) => ({ ...f, allowSearchPreferences: e.target.checked }))}
                  />
                </div>
              </div>
            )}

            {editForm.role === 'BUYER' && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Ajuste de Tarifa</label>
                  <p className="text-muted-foreground text-xs">Permite al usuario ajustar su propia tarifa de compra (Buy Rate).</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editForm.allowBuyRateAdjustment}
                    onChange={(e) => setEditForm((f) => ({ ...f, allowBuyRateAdjustment: e.target.checked }))}
                  />
                </div>
              </div>
            )}

            {/* Sección de Tarifas por Brand/País */}
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Tarifas por Brand/País</h3>
              <p className="text-muted-foreground mb-2 text-xs">
                Configura tarifas específicas de compra/venta para este usuario. Si no se configuran, se utilizarán las globales de la
                marca.
              </p>

              <div className="bg-muted/30 grid gap-1 rounded-lg border p-3">
                <div className="grid gap-1">
                  <label className="text-xs font-medium">Seleccionar Marca y País</label>
                  <Popover open={openBrandCountry} onOpenChange={setOpenBrandCountry}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openBrandCountry}
                        className="w-full justify-between text-xs font-normal"
                      >
                        {selectedBrandCountryId
                          ? brandCountryOptions.find((opt) => opt.id === selectedBrandCountryId)?.label || 'Seleccione una opción...'
                          : 'Seleccione una opción...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-85 p-0 sm:w-95" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar marca o país..." />
                        <CommandList className="max-h-48 overflow-y-auto">
                          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                          <CommandGroup>
                            {brandCountryOptions.map((opt) => (
                              <CommandItem
                                key={opt.id}
                                value={opt.label}
                                onSelect={() => {
                                  setSelectedBrandCountryId(opt.id);
                                  setOpenBrandCountry(false);
                                }}
                                className="text-xs"
                              >
                                <Check className={cn('mr-2 h-4 w-4', selectedBrandCountryId === opt.id ? 'opacity-100' : 'opacity-0')} />
                                {opt.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className={cn('grid gap-1', editUser?.role === 'ADMIN' ? 'grid-cols-2' : 'grid-cols-1')}>
                  {editUser?.role !== 'SELLER' && (
                    <div className="grid gap-1">
                      <label className="text-xs font-medium">Buy Rate (%)</label>
                      <Input
                        type="number"
                        placeholder="85"
                        value={rateForm.buyRate}
                        onChange={(e) => setRateForm((f) => ({ ...f, buyRate: e.target.value }))}
                      />
                    </div>
                  )}
                  {editUser?.role !== 'BUYER' && (
                    <div className="grid gap-1">
                      <label className="text-xs font-medium">Sell Rate (%)</label>
                      <Input
                        type="number"
                        placeholder="75"
                        value={rateForm.sellRate}
                        onChange={(e) => setRateForm((f) => ({ ...f, sellRate: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <Button size="sm" onClick={handleAddRate} className="bg-primary text-primary-foreground mt-1 w-full">
                  Agregar / Actualizar Tarifa
                </Button>
              </div>

              {/* Lista de tarifas */}
              <div className="mt-4 max-h-48 space-y-1 overflow-y-auto">
                {userRates.length === 0 ? (
                  <p className="text-muted-foreground p-2 text-center text-xs">No hay tarifas personalizadas configuradas.</p>
                ) : (
                  userRates.map((rate) => (
                    <div
                      key={rate.id}
                      className="bg-card text-card-foreground flex items-center justify-between rounded-md border p-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold">{rate.brandName}</span> ({rate.countryCode})
                        <div className="text-muted-foreground mt-0.5">
                          {editUser?.role === 'ADMIN' && (
                            <>
                              Buy: <span className="text-foreground font-medium">{rate.buyRate * 100}%</span> | Sell:{' '}
                              <span className="text-foreground font-medium">{rate.sellRate * 100}%</span>
                            </>
                          )}
                          {editUser?.role === 'BUYER' && (
                            <>
                              Buy: <span className="text-foreground font-medium">{rate.buyRate * 100}%</span>
                            </>
                          )}
                          {editUser?.role === 'SELLER' && (
                            <>
                              Sell: <span className="text-foreground font-medium">{rate.sellRate * 100}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 h-7 w-7"
                        onClick={() => handleDeleteRate(rate.brandCountryId)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateStatus === 'executing'}>
              {updateStatus === 'executing' ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular Telegram</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la vinculación con Telegram{unlinkTarget?.telegramUser?.username ? ` (@${unlinkTarget.telegramUser.username})` : ''}. El usuario no podrá usar el bot hasta que vuelva a vincular.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (unlinkTarget) executeUnlink({ userId: unlinkTarget.id });
              }}
              disabled={unlinkStatus === 'executing'}
            >
              {unlinkStatus === 'executing' ? 'Desvinculando...' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
