"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const ResetPasswordData = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number")
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain a special character"),
    confirmPassword: z.string(),
    portal: z.enum(["sell", "buy", "admin"]),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPassword = async (prevState: unknown, formData: FormData) => {
  const result = ResetPasswordData.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return result.error.issues[0].message;
  }

  const { token, newPassword, portal } = result.data;
  const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
  const loginPath = `${portalPath}/auth/login?reset=success`;

  try {
    await auth.api.resetPassword({
      body: { token, newPassword },
      headers: await headers(),
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return "Failed to reset password. The link may have expired.";
  }

  redirect(loginPath);
};
