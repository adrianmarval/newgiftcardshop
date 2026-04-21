'use client';

import { useQueryStates, debounce } from 'nuqs';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { orderSearchParamsParsers } from '@/components/buy/orders/orders-search-params';
import type { OrdersFiltersProps } from './types';

export const OrdersFilters = ({ onSearchChange }: OrdersFiltersProps) => {
  const [{ status, search, sort }, setParams] = useQueryStates(orderSearchParamsParsers, {
    shallow: false,
    limitUrlUpdates: debounce(400),
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    if (onSearchChange) {
      onSearchChange(newSearch);
    }
    setParams({ search: newSearch, page: 1 });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ search, page: 1 });
  };

  const handleClearFilters = () => {
    setParams({ status: 'ALL', search: '', sort: 'newest', page: 1 });
  };

  const hasActiveFilters = status !== 'ALL' || search || sort !== 'newest';

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <form onSubmit={handleSearchSubmit}>
          <Input
            placeholder="Buscar orden..."
            value={search}
            onChange={handleSearchChange}
            className="border-border bg-muted/20 h-8 pr-3 pl-9 text-xs md:h-10 md:text-sm"
          />
        </form>
      </div>

      {/* Filters Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={hasActiveFilters ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 px-2 md:h-9 md:gap-2 md:px-3">
            <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden md:inline">Filtros</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-4" align="end">
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

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">Estado</label>
              <Select value={status} onValueChange={(value) => setParams({ status: value as typeof status, page: 1 })}>
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

            {/* Sort Filter */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">Orden</label>
              <Select value={sort} onValueChange={(value) => setParams({ sort: value as typeof sort, page: 1 })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Mas nuevas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mas nuevas</SelectItem>
                  <SelectItem value="oldest">Mas viejas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters (visible only on mobile when filters active) */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={handleClearFilters} className="h-9 w-9 md:hidden">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
