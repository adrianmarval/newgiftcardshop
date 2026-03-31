import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Solmaira Cards",
  description: "Sign in to your Solmaira buyer account",
};

export default function BuyerLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm
        portal="buyer"
        title="Buyer Sign In"
        subtitle="Access your account to browse and buy gift cards"
        forgotPasswordUrl="/buy/auth/forgot-password"
        registerUrl="/buy/auth/register"
        registerPrompt="Don't have an account?"
        registerLinkText="Sign up"
      />
    </Suspense>
  );
}
