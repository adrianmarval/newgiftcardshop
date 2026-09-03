/**
 * json-payload — serialización JSON segura para payloads con Dates.
 *
 * Las server actions serializan con Flight (soporta Date nativamente); los
 * route handlers responden JSON puro, donde Date.toJSON() colapsa a string
 * ISO indistinguible de un string real. Este módulo marca las fechas de forma
 * explícita ({ $date: iso }) para que el cliente las revive como Date.
 *
 * Puro y client-safe (sin imports server) — se usa en ambos lados.
 */

const DATE_MARKER = '$date';

function isDateMarker(value: unknown): value is { [DATE_MARKER]: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof (value as Record<string, unknown>)[DATE_MARKER] === 'string'
  );
}

/** Deep walk: Date → { $date: iso }. Aplicar ANTES de JSON.stringify. */
export function serializeDates<T>(value: T): T {
  if (value instanceof Date) {
    return { [DATE_MARKER]: value.toISOString() } as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDates(item)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    // Objetos con prototipo custom (Decimal, etc.) se dejan intactos: su
    // toJSON propio los serializa (Decimal → string, como ya viajaba).
    if (Object.getPrototypeOf(value) !== Object.prototype) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeDates(v);
    }
    return out as T;
  }
  return value;
}

/** Deep walk inverso: { $date: iso } → Date. Aplicar tras res.json(). */
export function deserializeDates<T>(value: T): T {
  if (isDateMarker(value)) {
    return new Date(value[DATE_MARKER]) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deserializeDates(item)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deserializeDates(v);
    }
    return out as T;
  }
  return value;
}
