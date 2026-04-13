"use server";

import prisma from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import z from "zod";

/**
 * Retrieves a platform setting value by key.
 * Requires authentication — prevents unauthenticated reads of potentially sensitive settings.
 * Returns null if the key does not exist.
 */
export const getPlatformSetting = adminActionClient.action(async () => {
  const settings = await prisma.platformSettings.findMany();
  return settings;
});

/**
 * Creates or updates a platform setting. Requires ADMIN role.
 */
export const setPlatformSetting = adminActionClient
  .inputSchema(z.object({ key: z.string(), value: z.string(), description: z.string().optional() }))
  .action(async ({ parsedInput: { key, value, description } }) => {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
    return { success: true };
  });
