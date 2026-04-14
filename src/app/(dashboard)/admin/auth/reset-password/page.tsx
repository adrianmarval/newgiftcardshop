import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restablecer Contraseña | Portal Admin | Solmaira Cards",
  description: "Crea una nueva contraseña para tu cuenta de administrador de Solmaira",
};

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordForm portal="admin" />
    </Suspense>
  );
}
