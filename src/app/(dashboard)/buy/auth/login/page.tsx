import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión | Solmaira Cards",
  description: "Inicia sesión en tu cuenta de comprador de Solmaira",
};

export default function BuyerLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm
        portal="buy"
        title="Inicio de Sesión Comprador"
        subtitle="Accede a tu cuenta para explorar y comprar tarjetas de regalo"
        forgotPasswordUrl="/buy/auth/forgot-password"
        registerUrl="/buy/auth/register"
        registerPrompt="¿No tienes una cuenta?"
        registerLinkText="Regístrate"
      />
    </Suspense>
  );
}
