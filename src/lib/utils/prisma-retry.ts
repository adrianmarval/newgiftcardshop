// ─────────────────────────────────────────────────────────────────────────────
// Prisma — Retry acotado para transacciones Serializable
// SERVER-ONLY: importar directamente del archivo, NUNCA re-exportar en el barrel
// de @/lib/utils (lo consumen Client Components y arrastraría Prisma al bundle).
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';

/**
 * Ejecuta una transacción Serializable con retry acotado ante P2034
 * (write conflict / deadlock bajo SSI de Postgres).
 *
 * El abort por P2034 es ESPERADO bajo concurrencia (ej. dos creates del mismo
 * buyer chocando en el credit limit check) — sin retry, una colisión se
 * convertía en un 500 / "error inesperado" para el usuario aunque reintentar
 * resuelve en milisegundos. Otros errores (P2025, P2002, ActionError) se
 * propagan sin reintentar.
 */
export async function withSerializableRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isSerializationFailure = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
      if (!isSerializationFailure || attempt >= maxAttempts) throw err;
    }
  }
}
