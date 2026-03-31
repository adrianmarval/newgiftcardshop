import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Sign In | Solmaira Cards",
  description: "Sign in to the admin portal",
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm
        portal="admin"
        title="Admin Portal"
        subtitle="Restricted access — administrators only"
        forgotPasswordUrl="/admin/auth/forgot-password"
        emailPlaceholder="admin@solmaira.com"
      />
    </Suspense>
  );
}
