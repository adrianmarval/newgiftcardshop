import { Suspense } from "react";
import { BuyerLoginForm } from "@/components/auth/buyer-login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Solmaira Cards",
  description: "Sign in to your Solmaira buyer account",
};

export default function BuyerLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuyerLoginForm />
    </Suspense>
  );
}
