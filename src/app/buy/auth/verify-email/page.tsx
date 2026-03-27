import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | Solmaira Cards",
  description: "Verify your Solmaira account email",
};

export default function BuyerVerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm portal="buy" />
    </Suspense>
  );
}
