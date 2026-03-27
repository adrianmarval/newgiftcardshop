import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Seller Portal | Solmaira Cards",
  description: "Create a new password for your Solmaira seller account",
};

export default function SellerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm portal="sell" />
    </Suspense>
  );
}
