import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Olvidé mi Contraseña | Portal Admin | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Restablece la contraseña de tu cuenta de administrador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default function AdminForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ForgotPasswordForm portal="admin" />
    </Suspense>
  );
}
