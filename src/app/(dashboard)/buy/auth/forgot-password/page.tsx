import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Olvidé mi Contraseña | Solmaira Cards',
  description: 'Restablece la contraseña de tu cuenta de Solmaira',
};

export default function BuyerForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm portal="buy" />
    </Suspense>
  );
}
