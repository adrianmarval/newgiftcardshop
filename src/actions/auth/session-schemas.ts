import { z } from 'zod';

export const getActiveSessionsOutputSchema = z.object({
  success: z.literal(true),
  sessions: z.array(
    z.object({
      id: z.string(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
      createdAt: z.date(),
      expiresAt: z.date(),
    })
  ),
});

export const revokeOtherSessionsOutputSchema = z.object({
  success: z.literal(true),
  revokedCount: z.number(),
});
