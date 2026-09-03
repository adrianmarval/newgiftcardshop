'use client';

import { useState, useEffect, startTransition, type ComponentType, type ReactNode } from 'react';
import { useQueryStates } from 'nuqs';
import { useQueryClient } from '@tanstack/react-query';
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
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FiltersBar, UserBadge } from '@/components/common';
import { cn } from '@/lib/ui';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import { updateUser, getUserRates, updateUserRates, deleteUserRates, unlinkTelegram } from '@/actions/admin/users/';
import { listBrands } from '@/actions/admin/catalog';
import { UrlPagination } from '@/components/ui/url-pagination';
import { adminUsersSearchParamsParsers, buildAdminUsersInput } from '@/lib/search-params';
import { useListQuery } from '@/hooks/use-list-query';
import { Power, Loader2, ChevronsUpDown, Check, Link2Off, Wallet, Copy, Pencil, X } from 'lucide-react';
import { copyToClipboard, apiQuery } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BrandCountrySummary, BrandWithCountries } from '@/types';
import type { User, UserRate, PaginationMeta } from '@/types';

type AdminUsersInput = ReturnType<typeof buildAdminUsersInput>;
type AdminUsersData = { success: true; items: User[]; pagination: PaginationMeta };

async function fetchAdminUsers(input: AdminUsersInput) {
  return apiQuery<AdminUsersData>('admin-users', input);
}

interface UsersManagerProps {
  initialUsers: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  /** Input exacto que usó el server page (para que el initialData aplique solo al primer paint). */
  initialInput: AdminUsersInput;
}

export function UsersManager({ initialUsers, pagination, initialInput }: UsersManagerProps) {
  const queryClient = useQueryClient();
  const [params] = useQueryStates(adminUsersSearchParamsParsers);
  const input = buildAdminUsersInput(params);

  const { data } = useListQuery({
    queryKey: 'admin-users',
    input,
    fetcher: fetchAdminUsers,
    initialInput,
    initialData: { success: true as const, items: initialUsers, pagination },
  });

  const users = data.items;
  const paginationMeta = data.pagination;

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const isMobile = useIsMobile();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
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

  const { execute: executeUpdate, status: updateStatus } = useAction(updateUser, {
    onSuccess: () => {
      showAlert.toast.success('Usuario actualizado');
      invalidateUsers();
      setEditUser(null);
    },
    onError: (e) => showAlert.toast.error('Error actualizando usuario: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeToggle, status: toggleStatus } = useAction(updateUser, {
    onSuccess: () => {
      showAlert.toast.success('Estado actualizado');
      invalidateUsers();
      setEditUser(null);
    },
    onError: (e) => showAlert.toast.error('Error actualizando usuario: ' + (e.error?.serverError || 'Unknown error')),
  });

  const { execute: executeUnlink, status: unlinkStatus } = useAction(unlinkTelegram, {
    onSuccess: () => {
      showAlert.toast.success('Telegram desvinculado');
      invalidateUsers();
      setUnlinkTarget(null);
      setEditUser(null);
    },
    onError: (e) => showAlert.toast.error('Error desvinculando: ' + (e.error?.serverError || 'Unknown error')),
  });

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setEditForm({
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

  const configuredRateIds = new Set(userRates.map((r) => r.brandCountryId));
  const brandCountryOptions = brands
    .flatMap((b) =>
      b.countries.map((c: BrandCountrySummary) => ({
        id: c.id,
        label: `${b.icon} ${b.name} (${c.countryCode})`,
      })),
    )
    .filter((opt) => !configuredRateIds.has(opt.id) || opt.id === selectedBrandCountryId);

  const editingRate = userRates.find((r) => r.brandCountryId === selectedBrandCountryId) ?? null;

  const handleEditRate = (rate: UserRate) => {
    setSelectedBrandCountryId(rate.brandCountryId);
    setRateForm({
      buyRate: String(+(rate.buyRate * 100).toFixed(2)),
      sellRate: String(+(rate.sellRate * 100).toFixed(2)),
    });
  };

  const handleClearRateForm = () => {
    setSelectedBrandCountryId('');
    setRateForm({ buyRate: '', sellRate: '' });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    executeUpdate({
      userId: editUser.id,
      creditLimit: editForm.creditLimit ? parseFloat(editForm.creditLimit) : undefined,
      minAmountPreference: editForm.minAmount ? parseFloat(editForm.minAmount) : null,
      maxAmountPreference: editForm.maxAmount ? parseFloat(editForm.maxAmount) : null,
      allowSearchPreferences: editForm.allowSearchPreferences,
      allowBuyRateAdjustment: editForm.allowBuyRateAdjustment,
    });
  };

  const isUpdating = updateStatus === 'executing' || toggleStatus === 'executing';

  // Contenedor adaptativo: Drawer bottom en mobile / Dialog centrado en desktop (patrón PromptDrawer)
  const EditRoot: ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; children?: ReactNode }> = isMobile
    ? Drawer
    : Dialog;
  const EditContent: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerContent : DialogContent;
  const EditHeader: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerHeader : DialogHeader;
  const EditTitle: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerTitle : DialogTitle;
  const EditDescription: ComponentType<{ className?: string; children?: ReactNode }> = isMobile
    ? DrawerDescription
    : DialogDescription;
  const EditFooter: ComponentType<{ className?: string; children?: ReactNode }> = isMobile ? DrawerFooter : DialogFooter;

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <FiltersBar
        parsers={adminUsersSearchParamsParsers}
        defaults={{ search: '', role: 'ALL', isActive: 'ALL' }}
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
          selects: [
            {
              label: 'Estado',
              paramKey: 'isActive',
              options: [
                { value: 'ALL', label: 'Todos' },
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ],
            },
          ],
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar">
        {users.map((user) => (
          <Card
            key={user.id}
            onClick={() => openEditDialog(user)}
            className="hover:border-primary/30 cursor-pointer overflow-visible transition-all duration-200 ease-out"
          >
            <CardContent className="flex items-center gap-3 py-3">
              <UserBadge
                user={user}
                size="md"
                className="min-w-0 flex-1"
                nameExtra={
                  !user.isActive && (
                    <Badge variant="destructive" className="shrink-0 text-xs">
                      Inactivo
                    </Badge>
                  )
                }
              />
              <Badge variant="outline" className="shrink-0">
                {user.role}
              </Badge>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No se encontraron usuarios.</p>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <UrlPagination totalPages={paginationMeta.totalPages} />
      </div>

      <EditRoot open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <EditContent className={isMobile ? undefined : 'custom-scrollbar max-h-[90vh] overflow-y-auto sm:max-w-106.25 md:max-w-125'}>
          <EditHeader className={isMobile ? 'items-start text-left' : undefined}>
            <EditTitle>Editar Usuario</EditTitle>
            <EditDescription>{editUser?.email}</EditDescription>
          </EditHeader>
          <div className={cn('grid gap-1 py-4', isMobile && 'custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4')}>
            {/* Método de pago (read-only, configurado por el seller) */}
            <div className="grid gap-1">
              <p className="text-sm font-medium">Método de Pago</p>
              {editUser?.paymentMethod ? (
                <div className="bg-muted/30 grid gap-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="text-muted-foreground h-4 w-4" />
                      <span className="font-medium">{editUser.paymentMethod.coin.symbol}</span>
                      <span className="text-muted-foreground">· {editUser.paymentMethod.network.name}</span>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {editUser.paymentMethod.isBinanceWallet ? '🏦 Binance' : '🔗 External'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 truncate rounded px-1.5 py-0.5 font-mono text-xs">
                      {editUser.paymentMethod.address}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 shrink-0 px-1.5"
                      onClick={async () => {
                        if (editUser.paymentMethod && (await copyToClipboard(editUser.paymentMethod.address))) {
                          showAlert.toast.success('Dirección copiada');
                        }
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
                  Sin método de pago configurado.
                </p>
              )}
            </div>

            {editUser?.role === 'BUYER' && (
              <div className="grid gap-1">
                <label className="text-sm font-medium">Límite de Crédito ($)</label>
                <Input
                  type="number"
                  value={editForm.creditLimit}
                  onChange={(e) => setEditForm((f) => ({ ...f, creditLimit: e.target.value }))}
                />
              </div>
            )}

            {editUser?.role === 'BUYER' && (
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

            {editUser?.role === 'BUYER' && (
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

            {editUser?.role === 'BUYER' && (
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
                marca. Usa el lápiz sobre una tarifa existente para editarla.
              </p>

              <div className="bg-muted/30 grid gap-1 rounded-lg border p-3">
                {editingRate && (
                  <div className="bg-primary/10 text-primary flex items-center justify-between rounded-md px-2 py-1 text-xs">
                    <span>
                      Editando: <span className="font-semibold">{editingRate.brandName}</span> ({editingRate.countryCode})
                    </span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleClearRateForm}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
                  {editingRate ? 'Actualizar Tarifa' : 'Agregar Tarifa'}
                </Button>
              </div>

              {/* Lista de tarifas */}
              <div className="custom-scrollbar mt-4 max-h-48 space-y-1 overflow-y-auto">
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
                      <div className="flex shrink-0 items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditRate(rate)}
                          title="Editar tarifa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 h-7 w-7"
                          onClick={() => handleDeleteRate(rate.brandCountryId)}
                          title="Eliminar tarifa"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Acciones de cuenta */}
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Acciones</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={editUser?.isActive ? 'destructive' : 'outline'}
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => {
                    if (editUser) executeToggle({ userId: editUser.id, isActive: !editUser.isActive });
                  }}
                >
                  {toggleStatus === 'executing' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="mr-2 h-4 w-4" />
                  )}
                  {editUser?.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                </Button>
                {editUser?.telegramUser && (
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => setUnlinkTarget(editUser)}>
                    <Link2Off className="mr-2 h-4 w-4" />
                    Desvincular Telegram
                  </Button>
                )}
              </div>
            </div>
          </div>
          <EditFooter className={isMobile ? 'flex-col-reverse' : undefined}>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateStatus === 'executing'}>
              {updateStatus === 'executing' ? 'Guardando...' : 'Guardar'}
            </Button>
          </EditFooter>
        </EditContent>
      </EditRoot>

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
