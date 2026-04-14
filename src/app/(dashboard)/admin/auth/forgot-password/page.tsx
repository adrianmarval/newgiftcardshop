import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Olvidé mi Contraseña | Portal Admin | Solmaira Cards",
  description: "Restablece la contraseña de tu cuenta de administrador de Solmaira",
};

export default function AdminForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ForgotPasswordForm portal="admin" />
    </Suspense>
  );
}
