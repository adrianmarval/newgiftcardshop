import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Solmaira Cards",
  description: "Create a new password for your Solmaira account",
};

export default function BuyerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm portal="buy" />
    </Suspense>
  );
}
