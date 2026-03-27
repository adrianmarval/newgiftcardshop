import { Suspense } from "react";
import { BuyerRegisterForm } from "@/components/auth/buyer-register-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Solmaira Cards",
  description: "Create your Solmaira buyer account",
};

export default function BuyerRegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuyerRegisterForm />
    </Suspense>
  );
}
