import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seller Sign In | Solmaira Cards',
  description: 'Sign in to your Solmaira seller account',
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
