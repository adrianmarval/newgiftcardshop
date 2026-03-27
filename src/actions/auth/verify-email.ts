"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const VerifyEmailData = z.object({
  token: z.string().min(1, "Verification token is required"),
  portal: z.enum(["sell", "buy", "admin"]),
});

export const verifyEmail = async (prevState: unknown, formData: FormData) => {
  const result = VerifyEmailData.safeParse({
    token: formData.get("token"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return result.error.issues[0].message;
  }

  const { token, portal } = result.data;
  const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
  const dashboardPath = `${portalPath}/dashboard`;

  try {
    await auth.api.verifyEmail({
      query: { token },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return "Verification failed. The code may have expired.";
  }

  redirect(dashboardPath);
};
