'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/**
 * useListQuery — patrón de data fetching para las vistas de listas
 * (admin/seller/buyer). Reemplaza el modelo "server action en page.tsx +
 * router.refresh()": la paginación/filtros viajan en la URL (nuqs shallow),
 * el queryKey incluye el input y React Query re-fetchea client-side.
 *
 * - El server page sigue fetcheando el primer paint y lo pasa como
 *   `initialData` + `initialInput`. El initialData SOLO se aplica cuando el
 *   input actual matchea el inicial (si no, una vista con params distintos
 *   mostraría data del combo inicial).
 * - `placeholderData: keepPreviousData`: al cambiar de página/filtro se
 *   sigue mostrando la data anterior mientras llega la nueva (sin flash de
 *   loading ni "caminata hacia atrás").
 * - Los eventos SSE invalidan la query key (ver REALTIME_QUERY_KEYS) y el
 *   refetch ocurre en el lugar, sin router.refresh().
 */

/** Stringify con keys ordenadas: compara inputs sin depender del orden de campos. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

interface UseListQueryOptions<TInput, TData> {
  /** Prefijo de la query key (debe matchear REALTIME_QUERY_KEYS para invalidación SSE). */
  queryKey: string;
  /** Input actual (derivado de los search params de la URL). */
  input: TInput;
  /** Llama la server action y desenvuelve el resultado (throw en error). */
  fetcher: (input: TInput) => Promise<TData>;
  /** Input exacto que usó el server page para el primer paint. */
  initialInput: TInput;
  /** Data del primer paint (server-rendered). */
  initialData: TData;
}

export function useListQuery<TInput, TData>({
  queryKey,
  input,
  fetcher,
  initialInput,
  initialData,
}: UseListQueryOptions<TInput, TData>) {
  // Huella del input inicial, computada una vez por mount (useState lazy init)
  const [initialKey] = useState(() => stableStringify(initialInput));
  const isInitial = stableStringify(input) === initialKey;

  const query = useQuery({
    queryKey: [queryKey, input],
    queryFn: () => fetcher(input),
    initialData: isInitial ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  // Garantía de data definida: placeholderData mantiene la data previa durante
  // refetches; si aun así no hubiera nada (error sin cache), cae al initialData
  // del primer paint — la lista nunca renderiza un estado undefined.
  return { ...query, data: query.data ?? initialData };
}
