import { Suspense } from 'react';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';

export const metadata: Metadata = {
  title: 'Verify Email | Seller Portal | Solmaira Cards',
  description: 'Verify your Solmaira seller account email',
};

export default async function SellerVerifyEmailPage() {
  await getSession();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm portal="sell" />
    </Suspense>
  );
}
