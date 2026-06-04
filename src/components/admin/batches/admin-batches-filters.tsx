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
import { cn } from '@/lib/utils';
import { adminBatchesSearchParamsParsers } from '@/lib/search-params';

interface AdminBatchesFiltersProps {
  sellers: Array<{ id: string; name: string }>;
}

export function AdminBatchesFilters({ sellers }: AdminBatchesFiltersProps) {
  const [params, setParams] = useQueryStates(
    {
      status: adminBatchesSearchParamsParsers.status,
      search: adminBatchesSearchParamsParsers.search,
      sort: adminBatchesSearchParamsParsers.sort,
      sellerId: adminBatchesSearchParamsParsers.sellerId,
    },
    {
      shallow: false,
      limitUrlUpdates: debounce(400),
    },
  );

  const [openSeller, setOpenSeller] = useState(false);

  const hasActiveFilters = params.status !== 'ALL' || params.search || params.sort !== 'newest' || params.sellerId;

  const handleClearFilters = () => {
    setParams({ status: 'ALL', search: '', sort: 'newest', sellerId: '' });
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por ID de lote o vendedor..."
          value={params.search || ''}
          onChange={(e) => setParams({ search: e.target.value })}
          className="border-border bg-muted/20 h-8 pr-3 pl-9 text-xs md:h-10 md:text-sm"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={hasActiveFilters ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 px-2 md:h-10 md:gap-1 md:px-3">
            <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden md:inline md:text-lg">Filtros</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-4" align="end">
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

            <div className="flex flex-col space-y-1">
              <Label className="text-xs">Vendedor</Label>
              <Popover open={openSeller} onOpenChange={setOpenSeller}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSeller}
                    className="h-8 w-full justify-between text-xs font-normal md:h-9 md:text-sm"
                  >
                    {params.sellerId && params.sellerId !== 'ALL'
                      ? sellers.find((s) => s.id === params.sellerId)?.name || 'Vendedor no encontrado'
                      : 'Todos los vendedores'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-70 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar vendedor..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron vendedores.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="ALL"
                          onSelect={() => {
                            setParams({ sellerId: '' });
                            setOpenSeller(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', !params.sellerId ? 'opacity-100' : 'opacity-0')} />
                          Todos los vendedores
                        </CommandItem>
                        {sellers.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={() => {
                              setParams({ sellerId: s.id });
                              setOpenSeller(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', params.sellerId === s.id ? 'opacity-100' : 'opacity-0')} />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={params.status || 'ALL'} onValueChange={(value) => setParams({ status: value as typeof params.status })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PROCESSING">En proceso</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                  <SelectItem value="PAID">Pagado</SelectItem>
                  <SelectItem value="WITH_ISSUES">Con problemas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ordenar por</Label>
              <Select value={params.sort || 'newest'} onValueChange={(value) => setParams({ sort: value as typeof params.sort })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Más recientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="oldest">Más antiguos</SelectItem>
                  <SelectItem value="amount_high">Monto: Mayor a menor</SelectItem>
                  <SelectItem value="amount_low">Monto: Menor a mayor</SelectItem>
                </SelectContent>
              </Select>
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
