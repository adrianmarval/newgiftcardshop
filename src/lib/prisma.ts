import 'dotenv/config';

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  // Placeholder parseable para el build de Coolify: `next build` importa este módulo
  // al recolectar page data y ahí DATABASE_URL no existe (es runtime-only). pg.Pool
  // NO conecta al construirse — abre socket recién en la primera query, que ocurre
  // en runtime donde DATABASE_URL está inyectada. Ninguna página estática consulta
  // la DB en build (verificado: landing sin prisma; setup-passkey/account son
  // dinámicas via headers()).
  const connectionString = process.env.DATABASE_URL ?? 'postgresql://build:build@localhost:5432/build';

  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
};

const prisma = globalForPrisma.prisma || createPrismaClient();

// SIEMPRE asignar (no solo en dev): en producción webpack duplica este módulo
// en varios chunks y server.ts corre vía tsx con otro module graph. Sin la
// asignación incondicional, CADA chunk crea su propio Pool (max 20 conexiones
// c/u) — N copias × 20 conexiones contra el max_connections de Postgres.
// Ver el invariante en src/lib/realtime/bus.ts.
globalForPrisma.prisma = prisma;

export default prisma;
