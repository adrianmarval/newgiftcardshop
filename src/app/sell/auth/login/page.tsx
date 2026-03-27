import { Suspense } from "react";
import { SellerLoginForm } from "@/components/auth/seller-login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Sign In | Solmaira Cards",
  description: "Sign in to your Solmaira seller account",
};

export default function SellerLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SellerLoginForm />
    </Suspense>
  );
}
