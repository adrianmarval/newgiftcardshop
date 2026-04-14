import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar Correo | Portal Admin | Solmaira Cards",
  description: "Verifica el correo de tu cuenta de administrador de Solmaira",
};

export default function AdminVerifyEmailPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <VerifyEmailForm portal="admin" />
    </Suspense>
  );
}
