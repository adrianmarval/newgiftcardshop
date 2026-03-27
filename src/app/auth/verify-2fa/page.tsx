import { Verify2FAForm } from "@/components/auth/verify-2fa-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-Factor Authentication | Solmaira Cards Sell",
  description: "Complete two-factor authentication",
};

export default function Verify2FAPage() {
  return <Verify2FAForm />;
}
