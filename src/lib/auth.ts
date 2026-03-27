import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins"; // Added this import
import prisma from "@/lib/prisma";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { render } from "@react-email/components";
import { VerifyEmailTemplate } from "@/emails/verify-email";
import { ResetPasswordTemplate } from "@/emails/reset-password";

export const auth = betterAuth({
  appName: "Solmaira", // Added appName
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const html = await render(ResetPasswordTemplate({ url, userName: user.name }));
      await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: "Reset your Solmaira password",
        html,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Extract the token from the URL for display as code
      const token = new URL(url).searchParams.get("token") || "";
      const code = token.slice(0, 6).toUpperCase();
      const html = await render(VerifyEmailTemplate({ code, userName: user.name }));
      await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: "Verify your Solmaira email",
        html,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string[]",
        defaultValue: ["BUYER"],
        input: true,
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: "Solmaira", // Added issuer
      skipVerificationOnEnable: true,
    }),
    nextCookies(),
  ],
});
