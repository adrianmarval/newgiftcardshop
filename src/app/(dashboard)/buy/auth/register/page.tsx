import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Regístrate | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Crea tu cuenta de comprador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default function BuyerRegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm
        portal="buy"
        redirectTo="/buy"
        loginUrl="/buy/auth/login"
        title="Crear Cuenta"
        subtitle="Regístrate para empezar a comprar tarjetas de regalo a excelentes precios"
      />
    </Suspense>
  );
}
