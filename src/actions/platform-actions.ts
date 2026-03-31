"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Retrieves a platform setting value by key. No auth required.
 * Returns null if the key does not exist.
 */
export async function getPlatformSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch (error) {
    console.error("Error fetching platform setting:", error);
    return null;
  }
}

/**
 * Creates or updates a platform setting. Requires ADMIN role.
 */
export async function setPlatformSetting(key: string, value: string, description?: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) throw new Error("Unauthorized");

    const isAdmin = (session.user as { role?: string[] }).role?.includes("ADMIN") ?? false;
    if (!isAdmin) throw new Error("Admin role required");

    await prisma.platformSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting platform setting:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update setting" };
  }
}
