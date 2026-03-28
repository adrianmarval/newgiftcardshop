import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | Admin Portal | Solmaira Cards",
  description: "Verify your Solmaira admin account email",
};

export default function AdminVerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm portal="admin" />
    </Suspense>
  );
}
