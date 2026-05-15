import { Suspense } from 'react';
import { Verify2FAForm } from '@/components/auth/verify-2fa-form';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';

export const metadata: Metadata = {
  title: `Verify 2FA | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Verify your identity with two-factor authentication',
};

export default async function SellVerify2FAPage() {
  await getSession();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Verify2FAForm portal="sell" />
    </Suspense>
  );
}
