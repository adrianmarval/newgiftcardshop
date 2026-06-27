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
import { adminLogsSearchParamsParsers } from '@/lib/search-params';
import { cn } from '@/lib/ui';

interface AdminLogsFiltersProps {
  users: Array<{ id: string; name: string; email: string }>;
}

export const AdminLogsFilters = ({ users }: AdminLogsFiltersProps) => {
  const [params, setParams] = useQueryStates(
    {
      level: adminLogsSearchParamsParsers.level,
      source: adminLogsSearchParamsParsers.source,
      flow: adminLogsSearchParamsParsers.flow,
      search: adminLogsSearchParamsParsers.search,
      userId: adminLogsSearchParamsParsers.userId,
      dateFrom: adminLogsSearchParamsParsers.dateFrom,
      dateTo: adminLogsSearchParamsParsers.dateTo,
    },
    {
      shallow: false,
      limitUrlUpdates: debounce(400),
    },
  );

  const [openUser, setOpenUser] = useState(false);

  const hasActiveFilters =
    params.level !== 'ALL' || params.source !== 'ALL' || params.flow !== 'ALL' || params.userId || params.search || params.dateFrom || params.dateTo;

  const handleClearFilters = () => {
    setParams({ level: 'ALL', source: 'ALL', flow: 'ALL', userId: '', search: '', dateFrom: '', dateTo: '' });
  };

  const selectedUser = users.find((u) => u.id === params.userId);

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar en mensajes y acciones..."
          value={params.search || ''}
          onChange={(e) => setParams({ search: e.target.value })}
          className="border-border bg-muted/20 h-8 pr-3 pl-9 text-xs md:h-10 md:text-sm"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={hasActiveFilters ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 px-2 md:h-10 md:gap-1 md:px-3">
            <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden md:inline">Filtros</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-4" align="end">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filtros</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs">
                  <X className="mr-1 h-3 w-3" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* Nivel */}
            <div className="space-y-1">
              <Label className="text-xs">Nivel</Label>
              <Select value={params.level || 'ALL'} onValueChange={(value) => setParams({ level: value as typeof params.level })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fuente */}
            <div className="space-y-1">
              <Label className="text-xs">Fuente</Label>
              <Select value={params.source || 'ALL'} onValueChange={(value) => setParams({ source: value as typeof params.source })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="seller-bot">Seller Bot</SelectItem>
                  <SelectItem value="buyer-bot">Buyer Bot</SelectItem>
                  <SelectItem value="cron">Cron</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flujo */}
            <div className="space-y-1">
              <Label className="text-xs">Flujo</Label>
              <Select value={params.flow || 'ALL'} onValueChange={(value) => setParams({ flow: value as typeof params.flow })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="sell">Venta</SelectItem>
                  <SelectItem value="buy">Compra</SelectItem>
                  <SelectItem value="order">Orden</SelectItem>
                  <SelectItem value="payment">Pago</SelectItem>
                  <SelectItem value="batch">Lote</SelectItem>
                  <SelectItem value="auth">Autenticación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usuario */}
            <div className="flex flex-col space-y-1">
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
                <PopoverContent className="w-70 p-0" align="start">
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
                      {users.length > 0 && (
                        <CommandGroup heading="Usuarios">
                          {users.map((u) => (
                            <CommandItem
                              key={u.id}
                              value={`${u.name} ${u.email}`}
                              onSelect={() => {
                                setParams({ userId: u.id });
                                setOpenUser(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', params.userId === u.id ? 'opacity-100' : 'opacity-0')} />
                              {u.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Rango de fechas */}
            <div className="grid grid-cols-2 gap-1">
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={params.dateFrom || ''}
                  onChange={(e) => setParams({ dateFrom: e.target.value })}
                  className="h-8 text-xs md:h-9"
                />
              </div>
              <div className="space-y-1">
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
