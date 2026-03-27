"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

const ForgotPasswordData = z.object({
  email: z.email("Invalid email address"),
  portal: z.enum(["sell", "buy", "admin"]),
});

export const forgotPassword = async (
  prevState: unknown,
  formData: FormData,
) => {
  const result = ForgotPasswordData.safeParse({
    email: formData.get("email"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, portal } = result.data;

  const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
  const callbackURL = `${process.env.BETTER_AUTH_URL}${portalPath}/auth/reset-password`;

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: callbackURL,
      },
      headers: await headers(),
    });

    return { success: true, email };
  } catch (error) {
    console.error("Forgot password error:", error);
    // Always return success to prevent email enumeration
    return { success: true, email };
  }
};
