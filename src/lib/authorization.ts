import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, unauthorized } from "next/navigation";
import type { Role } from "@/generated/prisma/client";

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) unauthorized();
  return session;
}

export async function authorizeByRequiredRole(requiredRoles: Role[]) {
  const session = await getSession();
  if (!session.user.role.some((role) => requiredRoles.includes(role as Role))) {
    unauthorized();
  }
  return session;
}

export async function authorizeOrRedirect(requiredRoles: Role[], redirectTo: string) {
  const session = await getSession();
  if (!session?.user) redirect(redirectTo);
  if (!session.user.role.some((role) => requiredRoles.includes(role as Role))) {
    redirect(redirectTo);
  }
  return session;
}
