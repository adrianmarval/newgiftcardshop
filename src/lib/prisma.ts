import 'dotenv/config';

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Ensure .env is loaded before the app starts.');
  }

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
