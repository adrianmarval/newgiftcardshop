'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AsyncUserCombobox — combobox de usuarios con búsqueda SERVER-SIDE.
//
// Reemplaza al patrón viejo de precargar TODOS los usuarios de un rol en el
// server page (getUsersByRole) — eso no escala (100k users = payload RSC
// gigante + cmdk renderizando 100k nodos). Acá el filtro vive en la DB via
// `admin-user-search` (GET /api/query — NUNCA server action, ver api-query.ts)
// con take acotado y debounce.
//
// El label del valor seleccionado se resuelve con lookup por `id` cuando el
// valor viene de la URL (deep link / reload) y no está en los resultados.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/ui';
import { apiQuery } from '@/lib/utils';
import type { AdminUserSearchResult } from '@/lib/services/user';

export type AsyncUserRole = 'SELLER' | 'BUYER' | 'ADMIN' | 'ALL';

interface AsyncUserComboboxProps {
  value: string;
  onChange: (id: string) => void;
  /** Rol a filtrar server-side; 'ALL' = todos (agrupa por rol en la lista). */
  role?: AsyncUserRole;
  allLabel: string;
  emptyLabel: string;
  searchPlaceholder?: string;
  className?: string;
}

interface SearchResponse {
  users: AdminUserSearchResult[];
}

const ROLE_GROUP_ORDER: Role[] = ['SELLER', 'BUYER', 'ADMIN'];
const ROLE_GROUP_LABEL: Record<Role, string> = { SELLER: 'Sellers', BUYER: 'Buyers', ADMIN: 'Admins' };
type Role = AdminUserSearchResult['role'];

function UserRow({ user, selected, onSelect }: { user: AdminUserSearchResult; selected: boolean; onSelect: () => void }) {
  return (
    <CommandItem value={user.id} onSelect={onSelect}>
      <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
      <span className="min-w-0 flex-1 truncate">{user.name}</span>
      <span className="text-muted-foreground ml-2 shrink-0 truncate text-xs">
        {user.telegramUsername ? `@${user.telegramUsername}` : user.email}
      </span>
    </CommandItem>
  );
}

export function AsyncUserCombobox({
  value,
  onChange,
  role = 'ALL',
  allLabel,
  emptyLabel,
  searchPlaceholder = 'Buscar usuario...',
  className,
}: AsyncUserComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Debounce del texto de búsqueda (300ms)
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Label del seleccionado: se setea en handleSelect (evento). Si el valor
  // viene de la URL (deep link / reload) no hay selección previa → lookup
  // exacto por id. Todo derivado, sin effects (react-hooks/set-state-in-effect).
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchResult | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['admin-user-search', role, debouncedQuery],
    queryFn: () => apiQuery<SearchResponse>('admin-user-search', { role, query: debouncedQuery }),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: selectedData } = useQuery({
    queryKey: ['admin-user-search', 'by-id', value],
    queryFn: () => apiQuery<SearchResponse>('admin-user-search', { id: value }),
    enabled: !!value && selectedUser?.id !== value,
    staleTime: 60_000,
  });

  const users = data?.users ?? [];
  const labelUser =
    (selectedUser?.id === value ? selectedUser : undefined) ??
    users.find((u) => u.id === value) ??
    selectedData?.users.find((u) => u.id === value);
  const label = value ? (labelUser?.name ?? 'Cargando...') : allLabel;

  const grouped = role === 'ALL' ? ROLE_GROUP_ORDER.map((r) => ({ role: r, users: users.filter((u) => u.role === r) })).filter((g) => g.users.length > 0) : [{ role: null, users }];

  const handleSelect = (user: AdminUserSearchResult) => {
    setSelectedUser(user);
    onChange(user.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-8 w-full justify-between text-xs font-normal md:h-9 md:text-sm', className)}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-70 p-0" align="start">
        {/* shouldFilter={false}: el filtro es server-side (query debounced) */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{isFetching ? 'Buscando...' : emptyLabel}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  setSelectedUser(null);
                  onChange('');
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                {allLabel}
              </CommandItem>
            </CommandGroup>
            {grouped.map((g) => (
              <CommandGroup key={g.role ?? 'role'} heading={g.role ? ROLE_GROUP_LABEL[g.role] : undefined}>
                {g.users.map((u) => (
                  <UserRow key={u.id} user={u} selected={value === u.id} onSelect={() => handleSelect(u)} />
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
