"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { render } from "@react-email/components";
import { VerifyEmailTemplate } from "@/emails/verify-email";
import prisma from "@/lib/prisma";

const ResendVerificationData = z.object({
  email: z.email("Invalid email address"),
  portal: z.enum(["sell", "buy", "admin"]),
});

export const resendVerification = async (
  prevState: unknown,
  formData: FormData,
) => {
  const result = ResendVerificationData.safeParse({
    email: formData.get("email"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, portal } = result.data;
  const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
  const callbackURL = `${process.env.BETTER_AUTH_URL}${portalPath}/auth/verify-email`;

  try {
    // Find the user to get their name
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true },
    });

    // Use better-auth to send a new verification email
    await auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL,
      },
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { error: "Failed to resend verification email." };
  }
};
