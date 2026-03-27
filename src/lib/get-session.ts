import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Require roles. Redirects to the given path if the user
 * is not authenticated or does not have any of the required roles.
 */
export async function requireRoles(roles: Role[], redirectTo: string) {
  const session = await getSession();

  if (!session?.user) {
    redirect(redirectTo);
  }

  // better-auth returns the user from the session table,
  // but we need the role from the user table — so we cast
  // the additional fields that Prisma adds.
  const user = session.user as typeof session.user & { role?: Role[] };

  if (!user.role?.some((role) => roles.includes(role as Role))) {
    redirect(redirectTo);
  }

  return session;
}
