"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { authActionClient } from "@/lib/safe-action";
import { verifyEmailSchema, verifyEmailOutputSchema } from "@/types/auth/actions";

export const verifyEmail = authActionClient
  .inputSchema(verifyEmailSchema)
  .outputSchema(verifyEmailOutputSchema)
  .action(async function ({ parsedInput: { token, portal }, ctx }) {
    const portalPath = portal === "buy" ? "/buy" : `/${portal}`;
    const dashboardPath = `${portalPath}/dashboard`;

    try {
      await auth.api.verifyEmail({
        query: { token },
        headers: await headers(),
      });
      return { success: true, redirectTo: dashboardPath };
    } catch (error) {
      console.error("Verify email error:", error);
      return { error: "Verification failed. The code may have expired." };
    }
  });
