import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Restablecer Contraseña | Portal Admin | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Crea una nueva contraseña para tu cuenta de administrador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordForm portal="admin" />
    </Suspense>
  );
}
