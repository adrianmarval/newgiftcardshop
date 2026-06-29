// ─────────────────────────────────────────────────────────────────────────────
// AppLog — Application log entity types
// Mirrors the Prisma AppLog model with flattened user fields.
// ─────────────────────────────────────────────────────────────────────────────

export interface AppLogItem {
  id: string;
  timestamp: string;
  level: string;
  source: string;
  flow: string | null;
  action: string | null;
  message: string;
  userId: string | null;
  userName: string | null;
  metadata: unknown;
  error: unknown;
  ip: string | null;
}