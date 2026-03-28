import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Admin Portal | Solmaira Cards",
  description: "Create a new password for your Solmaira admin account",
};

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm portal="admin" />
    </Suspense>
  );
}
