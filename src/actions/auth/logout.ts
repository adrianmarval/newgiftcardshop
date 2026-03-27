"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const logout = async () => {
  await auth.api.signOut({ headers: await headers() });
  redirect("/auth/login");
};
