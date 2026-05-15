import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Become a Seller | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Create a seller account on ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default function SellerRegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm
        portal="sell"
        redirectTo="/sell"
        loginUrl="/sell/auth/login"
        title="Become a Seller"
        subtitle="Create your seller account to start listing gift cards"
      />
    </Suspense>
  );
}
