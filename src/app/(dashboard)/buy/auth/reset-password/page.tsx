import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Restablecer Contraseña | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Crea una nueva contraseña para tu cuenta de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default function BuyerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordForm portal="buy" />
    </Suspense>
  );
}
