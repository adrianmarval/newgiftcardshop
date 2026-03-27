import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Solmaira Cards Sell",
  description: "Create a new password for your account",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
