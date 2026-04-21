'use client';

import { useQueryStates, debounce } from 'nuqs';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { batchSearchParamsParsers } from './batches-search-params';
import type { BatchesFiltersProps } from './types';

export const BatchesFilters = ({ onSearchChange }: BatchesFiltersProps) => {
  const [{ status, search, sort }, setParams] = useQueryStates(batchSearchParamsParsers, {
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
            placeholder="Search..."
            value={search}
            onChange={handleSearchChange}
            className="border-border bg-muted/20 h-8 pr-3 pl-9 text-xs md:h-10 md:text-sm"
          />
        </form>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={hasActiveFilters ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 px-2 md:h-9 md:gap-2 md:px-3">
            <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden md:inline">Filters</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs">
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">Status</label>
              <Select value={status} onValueChange={(value) => setParams({ status: value as typeof status, page: 1 })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="REPORTED">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium">Sort</label>
              <Select value={sort} onValueChange={(value) => setParams({ sort: value as typeof sort, page: 1 })}>
                <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                  <SelectValue placeholder="Newest first" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
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
};
