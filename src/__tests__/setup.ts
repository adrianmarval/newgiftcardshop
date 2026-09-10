// Setup global de vitest — variables de entorno mínimas para que los módulos
// server-side (encryption, prisma) se puedan importar sin crashear en tests.
process.env.ENCRYPTION_KEY ??= 'a'.repeat(64);
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
