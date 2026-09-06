'use client';

import { useState, ReactNode } from 'react';
import { useQueryStates, debounce } from 'nuqs';
import { Search, X, SlidersHorizontal, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/ui';
import { AsyncUserCombobox, type AsyncUserRole } from './async-user-combobox';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface ComboboxOption {
  id: string;
  name: string;
  email?: string;
}

export interface FiltersBarConfig {
  search?: { placeholder: string; paramKey: string };
  combobox?: {
    label: string;
    paramKey: string;
    options: ComboboxOption[];
    allLabel: string;
    emptyLabel: string;
  };
  status?: { label: string; paramKey: string; options: SelectOption[] };
  /**
   * Comboboxes de usuarios con búsqueda SERVER-SIDE (admin-user-search).
   * Usar SIEMPRE este modo para filtros por usuario — el modo `combobox`
   * estático precarga la lista completa y no escala.
   */
  userComboboxes?: Array<{
    label: string;
    paramKey: string;
    role?: AsyncUserRole;
    allLabel: string;
    emptyLabel: string;
  }>;
  selects?: Array<{ label: string; paramKey: string; options: SelectOption[] }>;
  sort?: { label: string; paramKey: string; options: SelectOption[] };
  dateRange?: {
    fromParamKey: string;
    toParamKey: string;
    fromLabel?: string;
    toLabel?: string;
  };
}

// `parsers` accepts the full nuqs parsers object. We use a permissive type here
// because nuqs' inference is very strict and would require a generic to flow
// from the consumer. The runtime behavior is correct.
type NuqsParsers = Parameters<typeof useQueryStates>[0];
type Params = Record<string, unknown>;

export interface FiltersBarProps {
  parsers: NuqsParsers;
  config: FiltersBarConfig;
  defaults: Record<string, unknown>;
  customContent?: ReactNode;
  labels?: {
    filters?: string;
    clear?: string;
  };
}

const DEFAULT_LABELS = {
  filters: 'Filtros',
  clear: 'Limpiar',
};

// ── Component ────────────────────────────────────────────────────────────────

export function FiltersBar({
  parsers,
  config,
  defaults,
  customContent,
  labels = {},
}: FiltersBarProps) {
  // shallow: los filtros viven en la URL sin navegación server; la data se
  // re-fetchea client-side via useListQuery (queryKey = input derivado).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [params, setParams] = useQueryStates(parsers as any, {
    shallow: true,
    limitUrlUpdates: debounce(400),
  }) as [Params, (values: Record<string, unknown>) => void];

  const [openCombobox, setOpenCombobox] = useState(false);
  const popoverTitle = labels.filters ?? DEFAULT_LABELS.filters;
  const clearLabel = labels.clear ?? DEFAULT_LABELS.clear;
  const active = Object.keys(defaults).some(
    (k) => (params[k] ?? '') !== (defaults[k] ?? ''),
  );

  // Toda vista de listas incluye `page` en sus parsers: al cambiar cualquier
  // filtro se resetea a página 1 (page=1 es el default → nuqs lo limpia de la
  // URL). Sin esto, filtrar estando en una página alta cae en página vacía.
  const setParam = (key: string, value: unknown) => setParams({ [key]: value, page: 1 });

  const handleClear = () => setParams({ ...defaults, page: 1 });

  const getParam = (key: string) => (params[key] as string) || '';

  return (
    <div className="flex items-center gap-1">
      {config.search && (
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={config.search.placeholder}
            value={getParam(config.search.paramKey)}
            onChange={(e) => setParam(config.search!.paramKey, e.target.value)}
            className="border-border bg-muted/20 h-8 pr-3 pl-9 text-xs md:h-10 md:text-sm"
          />
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={active ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 px-2 md:h-10 md:gap-1 md:px-3"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden md:inline">{popoverTitle}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-4" align="end">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{popoverTitle}</span>
              {active && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs">
                  <X className="mr-1 h-3 w-3" />
                  {clearLabel}
                </Button>
              )}
            </div>

            {customContent}

            {config.combobox && (() => {
              const cb = config.combobox;
              const selectedId = getParam(cb.paramKey);
              return (
                <div className="flex flex-col space-y-1">
                  <Label className="text-xs">{cb.label}</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="h-8 w-full justify-between text-xs font-normal md:h-9 md:text-sm"
                      >
                        {(() => {
                          if (!selectedId) return cb.allLabel;
                          const found = cb.options.find((o) => o.id === selectedId);
                          return found ? found.name : 'No encontrado';
                        })()}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-70 p-0" align="start">
                      <Command>
                        <CommandInput placeholder={`Buscar ${cb.label.toLowerCase()}...`} />
                        <CommandList>
                          <CommandEmpty>{cb.emptyLabel}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="ALL"
                              onSelect={() => {
                                setParam(cb.paramKey, '');
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  !selectedId ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {cb.allLabel}
                            </CommandItem>
                            {cb.options.map((opt) => (
                              <CommandItem
                                key={opt.id}
                                value={opt.name}
                                onSelect={() => {
                                  setParam(cb.paramKey, opt.id);
                                  setOpenCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedId === opt.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {opt.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })()}

            {config.userComboboxes?.map((ucb) => (
              <div key={ucb.paramKey} className="flex flex-col space-y-1">
                <Label className="text-xs">{ucb.label}</Label>
                <AsyncUserCombobox
                  value={getParam(ucb.paramKey)}
                  onChange={(id) => setParam(ucb.paramKey, id)}
                  role={ucb.role}
                  allLabel={ucb.allLabel}
                  emptyLabel={ucb.emptyLabel}
                  searchPlaceholder={`Buscar ${ucb.label.toLowerCase()}...`}
                />
              </div>
            ))}

            {config.status && (
              <div className="space-y-1">
                <Label className="text-xs">{config.status.label}</Label>
                <Select
                  value={getParam(config.status.paramKey) || 'ALL'}
                  onValueChange={(value) => setParam(config.status!.paramKey, value)}
                >
                  <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.status.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.selects?.map((sel) => (
              <div key={sel.paramKey} className="space-y-1">
                <Label className="text-xs">{sel.label}</Label>
                <Select
                  value={getParam(sel.paramKey) || 'ALL'}
                  onValueChange={(value) => setParam(sel.paramKey, value)}
                >
                  <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {sel.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {config.sort && (
              <div className="space-y-1">
                <Label className="text-xs">{config.sort.label}</Label>
                <Select
                  value={getParam(config.sort.paramKey) || 'newest'}
                  onValueChange={(value) => setParam(config.sort!.paramKey, value)}
                >
                  <SelectTrigger className="h-8 text-xs md:h-9 md:text-sm">
                    <SelectValue placeholder="Más recientes" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.sort.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.dateRange && (() => {
              const dr = config.dateRange;
              return (
                <div className="grid grid-cols-2 gap-1">
                  <div className="space-y-1">
                    <Label className="text-xs">{dr.fromLabel ?? 'Desde'}</Label>
                    <Input
                      type="date"
                      value={getParam(dr.fromParamKey)}
                      onChange={(e) => setParam(dr.fromParamKey, e.target.value)}
                      className="h-8 text-xs md:h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{dr.toLabel ?? 'Hasta'}</Label>
                    <Input
                      type="date"
                      value={getParam(dr.toParamKey)}
                      onChange={(e) => setParam(dr.toParamKey, e.target.value)}
                      className="h-8 text-xs md:h-9"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </PopoverContent>
      </Popover>

      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground h-8 gap-1 px-2 text-xs md:h-10"
        >
          <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden md:inline">{clearLabel}</span>
        </Button>
      )}
    </div>
  );
}