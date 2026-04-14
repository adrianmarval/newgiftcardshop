import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inicio de Sesión Admin | Solmaira Cards",
  description: "Inicia sesión en el portal de administración",
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginForm
        portal="admin"
        title="Portal de Admin"
        subtitle="Acceso restringido — solo administradores"
        forgotPasswordUrl="/admin/auth/forgot-password"
        emailPlaceholder="admin@solmaira.com"
      />
    </Suspense>
  );
}
