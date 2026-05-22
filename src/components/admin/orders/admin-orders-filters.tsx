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
import { adminOrdersSearchParamsParsers } from '@/lib/search-params/admin-orders';
import { cn } from '@/lib/utils';

interface AdminOrdersFiltersProps {
  buyers: Array<{ id: string; name: string; email: string }>;
}

export function AdminOrdersFilters({ buyers }: AdminOrdersFiltersProps) {
  const [params, setParams] = useQueryStates(
    {
      status: adminOrdersSearchParamsParsers.status,
      search: adminOrdersSearchParamsParsers.search,
      buyerId: adminOrdersSearchParamsParsers.buyerId,
      dateFrom: adminOrdersSearchParamsParsers.dateFrom,
      dateTo: adminOrdersSearchParamsParsers.dateTo,
    },
    {
      shallow: false,
      limitUrlUpdates: debounce(400),
    },
  );

  const [openBuyer, setOpenBuyer] = useState(false);

  const hasActiveFilters = params.status !== 'ALL' || params.search || params.buyerId || params.dateFrom || params.dateTo;

  const handleClearFilters = () => {
    setParams({ status: 'ALL', search: '', buyerId: '', dateFrom: '', dateTo: '' });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar orden..."
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

            <div className="flex flex-col space-y-2">
              <Label className="text-xs">Comprador</Label>
              <Popover open={openBuyer} onOpenChange={setOpenBuyer}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBuyer}
                    className="h-8 w-full justify-between text-xs font-normal md:h-9 md:text-sm"
                  >
                    {params.buyerId ? buyers.find((b) => b.id === params.buyerId)?.name || 'No encontrado' : 'Todos los compradores'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-70 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar comprador..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron compradores.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="ALL"
                          onSelect={() => {
                            setParams({ buyerId: '' });
                            setOpenBuyer(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', !params.buyerId ? 'opacity-100' : 'opacity-0')} />
                          Todos los compradores
                        </CommandItem>
                        {buyers.map((b) => (
                          <CommandItem
                            key={b.id}
                            value={b.name}
                            onSelect={() => {
                              setParams({ buyerId: b.id });
                              setOpenBuyer(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', params.buyerId === b.id ? 'opacity-100' : 'opacity-0')} />
                            {b.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Estado</Label>
              <Select value={params.status || 'ALL'} onValueChange={(value) => setParams({ status: value as typeof params.status })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="AWAITING_PAYMENT">Esperando</SelectItem>
                  <SelectItem value="COMPLETED">Completada</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
}
