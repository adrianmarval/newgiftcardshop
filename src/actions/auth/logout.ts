"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const logout = async (formData: FormData) => {
  const portal = (formData.get("portal") as string) || "buy";
  await auth.api.signOut({ headers: await headers() });
  redirect(`/${portal}/auth/login`);
};
