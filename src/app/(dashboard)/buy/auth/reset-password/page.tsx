import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restablecer Contraseña | Solmaira Cards',
  description: 'Crea una nueva contraseña para tu cuenta de Solmaira',
};

export default function BuyerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordForm portal="buy" />
    </Suspense>
  );
}
