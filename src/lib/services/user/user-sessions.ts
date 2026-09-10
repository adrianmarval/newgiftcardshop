// ─────────────────────────────────────────────────────────────────────────────
// User Sessions Service — sesiones activas del usuario (profile security UI).
// ─────────────────────────────────────────────────────────────────────────────

import prisma from '@/lib/prisma';

export async function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}
