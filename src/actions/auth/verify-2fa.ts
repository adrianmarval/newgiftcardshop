"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const Verify2FAData = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
  portal: z.enum(["sell", "buy", "admin"]),
});

const dashboardMap = {
  sell: "/sell/dashboard",
  buy: "/buy/dashboard",
  admin: "/admin/dashboard",
} as const;

export const verify2FA = async (prevState: unknown, formData: FormData) => {
  const result = Verify2FAData.safeParse({
    code: formData.get("code"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return result.error.issues[0].message;
  }

  const { code, portal } = result.data;

  try {
    await auth.api.verifyTOTP({
      body: {
        code,
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    return "Invalid verification code";
  }

  redirect(dashboardMap[portal]);
};
