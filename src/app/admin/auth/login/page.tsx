import { Suspense } from "react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Sign In | Solmaira Cards",
  description: "Sign in to the admin portal",
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
