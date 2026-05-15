import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Forgot Password | Seller Portal | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Reset your ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} seller account password`,
};

export default function SellerForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm portal="sell" />
    </Suspense>
  );
}
