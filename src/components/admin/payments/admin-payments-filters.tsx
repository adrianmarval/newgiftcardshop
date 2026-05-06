'use client';

import { useState } from 'react';
import { useQueryStates, debounce } from 'nuqs';
import { Search, X, SlidersHorizontal, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { adminPaymentsSearchParamsParsers } from '@/types/domain/admin';
import type { AdminPaymentsFiltersProps } from './types';
import { cn } from '@/lib/utils';

export const AdminPaymentsFilters = ({ sellers, buyers }: AdminPaymentsFiltersProps) => {
  const [params, setParams] = useQueryStates(
    {
      direction: adminPaymentsSearchParamsParsers.direction,
      category: adminPaymentsSearchParamsParsers.category,
      userId: adminPaymentsSearchParamsParsers.userId,
      search: adminPaymentsSearchParamsParsers.search,
      dateFrom: adminPaymentsSearchParamsParsers.dateFrom,
      dateTo: adminPaymentsSearchParamsParsers.dateTo,
    },
    {
      shallow: false,
      limitUrlUpdates: debounce(400),
    },
  );

  const [openUser, setOpenUser] = useState(false);

  const hasActiveFilters =
    params.direction !== 'ALL' || params.category !== 'ALL' || params.userId || params.search || params.dateFrom || params.dateTo;

  const handleClearFilters = () => {
    setParams({ direction: 'ALL', category: 'ALL', userId: '', search: '', dateFrom: '', dateTo: '' });
  };

  const allUsers = [...sellers.map((s) => ({ ...s, role: 'Seller' as const })), ...buyers.map((b) => ({ ...b, role: 'Buyer' as const }))];

  const selectedUser = allUsers.find((u) => u.id === params.userId);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por ID, tx Binance..."
          value={params.search || ''}
          onChange={(e) => setParams({ search: e.target.value })}
          className="border-border bg-muted/20 h-8 pr-3 pl-9 text-xs md:h-10 md:text-sm"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={hasActiveFilters ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 px-2 md:h-10 md:gap-2 md:px-3">
            <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden md:inline">Filtros</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filtros</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs">
                  <X className="mr-1 h-3 w-3" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* Usuario (sellers + buyers) */}
            <div className="flex flex-col space-y-2">
              <Label className="text-xs">Usuario</Label>
              <Popover open={openUser} onOpenChange={setOpenUser}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openUser}
                    className="h-8 w-full justify-between text-xs font-normal md:h-9 md:text-sm"
                  >
                    {selectedUser ? selectedUser.name : 'Todos los usuarios'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar usuario..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="ALL"
                          onSelect={() => {
                            setParams({ userId: '' });
                            setOpenUser(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', !params.userId ? 'opacity-100' : 'opacity-0')} />
                          Todos los usuarios
                        </CommandItem>
                      </CommandGroup>
                      {sellers.length > 0 && (
                        <CommandGroup heading="Sellers">
                          {sellers.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.name} ${s.email}`}
                              onSelect={() => {
                                setParams({ userId: s.id });
                                setOpenUser(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', params.userId === s.id ? 'opacity-100' : 'opacity-0')} />
                              {s.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {buyers.length > 0 && (
                        <CommandGroup heading="Buyers">
                          {buyers.map((b) => (
                            <CommandItem
                              key={b.id}
                              value={`${b.name} ${b.email}`}
                              onSelect={() => {
                                setParams({ userId: b.id });
                                setOpenUser(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', params.userId === b.id ? 'opacity-100' : 'opacity-0')} />
                              {b.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Dirección contable */}
            <div className="space-y-2">
              <Label className="text-xs">Dirección</Label>
              <Select
                value={params.direction || 'ALL'}
                onValueChange={(value) => setParams({ direction: value as typeof params.direction })}
              >
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="CREDIT">Ingresos (CREDIT)</SelectItem>
                  <SelectItem value="DEBIT">Egresos (DEBIT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label className="text-xs">Categoría</Label>
              <Select value={params.category || 'ALL'} onValueChange={(value) => setParams({ category: value as typeof params.category })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="ORDER">Orden</SelectItem>
                  <SelectItem value="BATCH">Batch</SelectItem>
                  <SelectItem value="DEPOSIT">Depósito</SelectItem>
                  <SelectItem value="REFUND_BUYER">Refund Buyer</SelectItem>
                  <SelectItem value="REFUND_SELLER">Refund Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rango de fechas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={params.dateFrom || ''}
                  onChange={(e) => setParams({ dateFrom: e.target.value })}
                  className="h-8 text-xs md:h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={params.dateTo || ''}
                  onChange={(e) => setParams({ dateTo: e.target.value })}
                  className="h-8 text-xs md:h-9"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={handleClearFilters} className="h-9 w-9 md:hidden">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
