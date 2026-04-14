"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { authActionClient } from "@/lib/safe-action";
import { registerSchema, registerOutputSchema } from "@/types/auth/actions";

const dashboardMap = {
  sell: "/sell/dashboard",
  buy: "/buy/dashboard",
} as const;

const roleMap = {
  sell: "SELLER",
  buy: "BUYER",
} as const;

export const register = authActionClient
  .inputSchema(registerSchema)
  .outputSchema(registerOutputSchema)
  .action(async function ({ parsedInput: { fullName, email, password, portal }, ctx }) {
    const callbackURL = dashboardMap[portal];
    const role = roleMap[portal];

    try {
      await auth.api.signUpEmail({
        body: {
          name: fullName,
          email,
          password,
          role: [role],
          callbackURL,
        },
        headers: await headers(),
      });
      return { success: true, redirectTo: callbackURL };
    } catch (error) {
      console.error("Registration error:", error);
      return { error: "An error occurred during registration. The email may already be in use." };
    }
  });
