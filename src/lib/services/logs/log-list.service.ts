// ─────────────────────────────────────────────────────────────────────────────
// App Logs List Service — Shared query + serialization for admin portal
// Pure function: usable from server actions AND route handlers.
// ─────────────────────────────────────────────────────────────────────────────

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';

export interface ListAppLogsInput {
  page: number;
  limit: number;
  level?: string;
  source?: string;
  flow?: string;
  search?: string;
  userId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export async function listAppLogs(input: ListAppLogsInput) {
  const { page, limit, level, source, flow, search, userId, dateFrom, dateTo } = input;
  const skip = (page - 1) * limit;

  const where: Prisma.AppLogWhereInput = {};

  if (level && level !== 'ALL') where.level = level;
  if (source && source !== 'ALL') where.source = source;
  if (flow && flow !== 'ALL') where.flow = flow;
  if (userId) where.userId = userId;

  if (dateFrom || dateTo) {
    where.timestamp = {};
    if (dateFrom) where.timestamp.gte = new Date(dateFrom);
    if (dateTo) where.timestamp.lte = new Date(dateTo);
  }

  if (search) {
    where.OR = [
      { message: { contains: search, mode: 'insensitive' } },
      { action: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [logs, totalCount] = await Promise.all([
    prisma.appLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.appLog.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    items: logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      source: log.source,
      flow: log.flow,
      action: log.action,
      message: log.message,
      userId: log.userId,
      userName: log.user?.name ?? null,
      metadata: log.metadata,
      error: log.error,
      ip: log.ip,
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
    },
  };
}
