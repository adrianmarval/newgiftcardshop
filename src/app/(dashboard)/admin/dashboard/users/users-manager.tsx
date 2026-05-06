'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/swal';
import { updateUser } from '@/actions/admin/users';
import { MoreVertical, Edit2, Power, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SELLER' | 'BUYER';
  isActive: boolean;
  creditLimit: number;
  buyRate: number;
  sellRate: number;
  minAmountPreference: number | null;
  maxAmountPreference: number | null;
  allowSearchPreferences: boolean;
  allowBuyRateAdjustment: boolean;
  createdAt: Date;
}

interface UsersManagerProps {
  initialUsers: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
  searchParams?: {
    search: string;
    role: string;
  };
}

export function UsersManager({ initialUsers, pagination, searchParams }: UsersManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchParams?.search || '');
  const [role, setRole] = useState(searchParams?.role || 'ALL');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    role: '',
    creditLimit: '',
    buyRate: '',
    sellRate: '',
    minAmount: '',
    maxAmount: '',
    allowSearchPreferences: false,
    allowBuyRateAdjustment: false,
  });

  const { execute: executeUpdate, status: updateStatus } = useAction(updateUser, {
    onSuccess: () => {
      showAlert.toast.success('Usuario actualizado');
      router.refresh();
      setEditUser(null);
    },
    onError: (e) => showAlert.error('Error', e.error?.serverError || 'Error actualizando usuario'),
  });

  const { execute: executeToggle, status: toggleStatus } = useAction(updateUser, {
    onSuccess: () => {
      showAlert.toast.success('Estado actualizado');
      router.refresh();
    },
    onError: (e) => showAlert.error('Error', e.error?.serverError || 'Error actualizando usuario'),
  });

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setEditForm({
      role: user.role,
      creditLimit: user.creditLimit.toString(),
      buyRate: (user.buyRate * 100).toString(),
      sellRate: (user.sellRate * 100).toString(),
      minAmount: user.minAmountPreference?.toString() || '',
      maxAmount: user.maxAmountPreference?.toString() || '',
      allowSearchPreferences: user.allowSearchPreferences,
      allowBuyRateAdjustment: user.allowBuyRateAdjustment,
    });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    executeUpdate({
      userId: editUser.id,
      role: editForm.role as 'ADMIN' | 'SELLER' | 'BUYER',
      creditLimit: editForm.creditLimit ? parseFloat(editForm.creditLimit) : undefined,
      buyRate: editForm.buyRate ? parseFloat(editForm.buyRate) / 100 : undefined,
      sellRate: editForm.sellRate ? parseFloat(editForm.sellRate) / 100 : undefined,
      minAmountPreference: editForm.minAmount ? parseFloat(editForm.minAmount) : null,
      maxAmountPreference: editForm.maxAmount ? parseFloat(editForm.maxAmount) : null,
      allowSearchPreferences: editForm.allowSearchPreferences,
      allowBuyRateAdjustment: editForm.allowBuyRateAdjustment,
    });
  };

  const handlePageChange = (newPage: number) => {
    const query = new URLSearchParams();
    query.set('page', newPage.toString());
    if (search) query.set('search', search);
    if (role !== 'ALL') query.set('role', role);
    router.push(`/admin/dashboard/users?${query.toString()}`);
  };

  const handleFilterChange = () => {
    const query = new URLSearchParams();
    query.set('page', '1');
    if (search) query.set('search', search);
    if (role !== 'ALL') query.set('role', role);
    router.push(`/admin/dashboard/users?${query.toString()}`);
  };

  const isUpdating = updateStatus === 'executing' || toggleStatus === 'executing';

  return (
    <div className="container mx-auto space-y-4 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-5xl font-black tracking-tighter italic md:text-7xl">USUARIOS</h1>
        <p className="text-muted-foreground text-base md:text-lg">Gestiona los usuarios del sistema.</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
            className="h-10"
          />
        </div>
        <Select value={role} onValueChange={(r) => setRole(r)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SELLER">Seller</SelectItem>
            <SelectItem value="BUYER">Buyer</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleFilterChange}>Buscar</Button>
      </div>

      <div className="space-y-2">
        {initialUsers.map((user) => (
          <Card key={user.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{user.name}</span>
                  {!user.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-sm">{user.email}</p>
              </div>
              <Badge variant="outline">{user.role}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="h-8 w-8" disabled={isUpdating}>
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

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Página {pagination.currentPage} de {pagination.totalPages} ({pagination.totalCount} usuarios)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage <= 1}
              onClick={() => handlePageChange(pagination.currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
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
              <div className="grid gap-2">
                <label className="text-sm font-medium">Límite de Crédito ($)</label>
                <Input
                  type="number"
                  value={editForm.creditLimit}
                  onChange={(e) => setEditForm((f) => ({ ...f, creditLimit: e.target.value }))}
                />
              </div>
            )}

            {editForm.role === 'BUYER' && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Buy Rate (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.buyRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, buyRate: e.target.value }))}
                />
              </div>
            )}

            {editForm.role === 'BUYER' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Min. Denominación ($)</label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={editForm.minAmount}
                    onChange={(e) => setEditForm((f) => ({ ...f, minAmount: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
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

            {(editForm.role === 'SELLER' || editForm.role === 'ADMIN') && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Sell Rate (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.sellRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, sellRate: e.target.value }))}
                />
              </div>
            )}
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
    </div>
  );
}
