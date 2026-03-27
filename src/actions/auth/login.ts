"use server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const LoginData = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  portal: z.enum(["sell", "buy", "admin"]),
});

const dashboardMap = {
  sell: "/sell/dashboard",
  buy: "/buy/dashboard",
  admin: "/admin/dashboard",
} as const;

const roleMap = {
  sell: "SELLER",
  buy: "BUYER",
  admin: "ADMIN",
} as const;

export const login = async (prevState: unknown, formData: FormData) => {
  const result = LoginData.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    portal: formData.get("portal"),
  });

  if (!result.success) {
    return result.error.issues[0].message;
  }

  const { email, password, portal } = result.data;
  const callbackURL = dashboardMap[portal];
  const requiredRole = roleMap[portal];

  try {
    const response = await auth.api.signInEmail({
      body: { email, password, callbackURL },
      headers: await headers(),
    }) as any;

    // Handle 2FA redirect
    if (response.twoFactorRedirect) {
      redirect(`/${portal}/auth/verify-2fa`);
    }

    // Verify user has the required role
    const user = response.user as typeof response.user & {
      role?: string[];
    };

    if (!user.role?.includes(requiredRole)) {
      // Sign them out since they don't have access to this portal
      await auth.api.signOut({ headers: await headers() });
      return `Your account does not have ${requiredRole.toLowerCase()} access`;
    }
  } catch (error) {
    console.error("Login error:", error);
    return "Invalid email or password";
  }

  redirect(callbackURL);
};
