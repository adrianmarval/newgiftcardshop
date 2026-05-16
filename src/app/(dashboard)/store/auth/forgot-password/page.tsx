import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Olvidé mi Contraseña | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Restablece la contraseña de tu cuenta de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default function BuyerForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm portal="buy" />
    </Suspense>
  );
}
