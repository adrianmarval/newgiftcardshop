'use server';

import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { adminActionClient, ActionError } from '@/lib/safe-action';
import { listLogsInputSchema, listLogsOutputSchema } from './schemas';

export const listLogs = adminActionClient
  .inputSchema(listLogsInputSchema)
  .outputSchema(listLogsOutputSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { page, limit, level, source, flow, search, userId, dateFrom, dateTo } = parsedInput;
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
        success: true as const,
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
    } catch (error) {
      console.error('[listLogs]', error);
      throw new ActionError('Error al obtener los logs.');
    }
  });