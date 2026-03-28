import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Seller Portal | Solmaira Cards",
  description: "Reset your Solmaira seller account password",
};

export default function SellerForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm portal="sell" />
    </Suspense>
  );
}
