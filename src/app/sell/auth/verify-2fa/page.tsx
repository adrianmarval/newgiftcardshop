import { Suspense } from "react";
import { Verify2FAForm } from "@/components/auth/verify-2fa-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify 2FA | Solmaira Cards",
  description: "Verify your identity with two-factor authentication",
};

export default function SellVerify2FAPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Verify2FAForm portal="sell" />
    </Suspense>
  );
}
