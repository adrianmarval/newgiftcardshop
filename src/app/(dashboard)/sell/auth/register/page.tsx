import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a Seller | Solmaira Cards',
  description: 'Create a seller account on Solmaira Cards',
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
