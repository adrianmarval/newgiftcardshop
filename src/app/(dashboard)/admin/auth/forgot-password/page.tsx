import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Admin Portal | Solmaira Cards",
  description: "Reset your Solmaira admin account password",
};

export default function AdminForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm portal="admin" />
    </Suspense>
  );
}
