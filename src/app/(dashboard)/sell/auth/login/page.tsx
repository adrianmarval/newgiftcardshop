import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Seller Sign In | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Sign in to your ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} seller account`,
};

export default function SellerLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm
        portal="sell"
        title="Seller Sign In"
        subtitle="Access your seller dashboard to manage gift cards"
        forgotPasswordUrl="/sell/auth/forgot-password"
        registerUrl="/sell/auth/register"
        registerPrompt="Don't have a seller account?"
        registerLinkText="Create one"
      />
    </Suspense>
  );
}
