'use client';

import { useQueryStates, debounce } from 'nuqs';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { orderSearchParamsParsers } from './orders-search-params';
import type { OrdersFiltersProps } from '@/types';

export function OrdersFilters({ onSearchChange }: OrdersFiltersProps) {
  const [{ status, search, sort }, setParams] = useQueryStates(orderSearchParamsParsers, {
    shallow: false,
    limitUrlUpdates: debounce(400),
  });

  const handleStatusChange = (value: string) => {
    setParams({ status: value as typeof status, page: 1 });
  };

  const handleSortChange = (value: 'newest' | 'oldest') => {
    setParams({ sort: value, page: 1 });
  };

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

  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h2 className="text-3xl font-black tracking-tight uppercase italic">Historial de Órdenes</h2>
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">Rastrea tus compras en tiempo real</p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar ID de orden..."
            value={search}
            onChange={handleSearchChange}
            className="border-border bg-muted/20 h-10 pl-10 font-medium"
          />
        </form>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="border-border bg-muted/20 h-10 w-full text-sm font-bold uppercase sm:w-44">
            <Filter className="mr-2 h-3 w-3" />
            <SelectValue placeholder="ESTADO" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover text-popover-foreground">
            <SelectItem value="ALL">TODAS</SelectItem>
            <SelectItem value="PENDING">PENDIENTE</SelectItem>
            <SelectItem value="AWAITING_PAYMENT">ESPERANDO PAGO</SelectItem>
            <SelectItem value="COMPLETED">COMPLETADA</SelectItem>
            <SelectItem value="CANCELLED">CANCELADA</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="border-border bg-muted/20 h-10 w-full text-sm font-bold uppercase sm:w-36">
            <SelectValue placeholder="ORDENAR" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover text-popover-foreground">
            <SelectItem value="newest">MÁS NUEVAS</SelectItem>
            <SelectItem value="oldest">MÁS VIEJAS</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
