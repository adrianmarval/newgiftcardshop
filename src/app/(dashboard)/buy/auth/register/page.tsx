import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Solmaira Cards",
  description: "Create your Solmaira buyer account",
};

export default function BuyerRegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm
        portal="buyer"
        redirectTo="/buy"
        loginUrl="/buy/auth/login"
        title="Create Account"
        subtitle="Sign up to start buying gift cards at great prices"
      />
    </Suspense>
  );
}
