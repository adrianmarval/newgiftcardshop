"use client";

import { useQueryStates, debounce } from "nuqs";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderSearchParamsParsers } from "./orders-search-params";
import type { OrdersFiltersProps } from "@/types";

export function OrdersFilters({ onSearchChange }: OrdersFiltersProps) {
  const [{ status, search, sort }, setParams] = useQueryStates(orderSearchParamsParsers, {
    shallow: false,
    limitUrlUpdates: debounce(400),
  });

  const handleStatusChange = (value: string) => {
    setParams({ status: value as typeof status, page: 1 });
  };

  const handleSortChange = (value: "newest" | "oldest") => {
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
    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div>
        <h2 className="text-3xl font-black italic tracking-tight uppercase">Order History</h2>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
          Track your purchases in real-time
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search order ID..."
            value={search}
            onChange={handleSearchChange}
            className="pl-10 h-10 bg-muted/20 border-border font-medium"
          />
        </form>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-muted/20 border-border font-bold text-sm uppercase">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="STATUS" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border-border">
            <SelectItem value="ALL">ALL ORDERS</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="AWAITING_PAYMENT">AWAITING PAYMENT</SelectItem>
            <SelectItem value="COMPLETED">COMPLETED</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-36 h-10 bg-muted/20 border-border font-bold text-sm uppercase">
            <SelectValue placeholder="SORT" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border-border">
            <SelectItem value="newest">NEWEST</SelectItem>
            <SelectItem value="oldest">OLDEST</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
