import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Reset Password | Seller Portal | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Create a new password for your ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} seller account`,
};

export default function SellerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm portal="sell" />
    </Suspense>
  );
}
