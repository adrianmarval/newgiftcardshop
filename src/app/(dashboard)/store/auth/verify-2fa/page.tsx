import { Suspense } from 'react';
import { Verify2FAForm } from '@/components/auth/verify-2fa-form';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';

export const metadata: Metadata = {
  title: `Verificar 2FA | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Verifica tu identidad con autenticación de dos factores',
};

export default async function BuyVerify2FAPage() {
  await getSession();

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <Verify2FAForm portal="buy" />
    </Suspense>
  );
}
