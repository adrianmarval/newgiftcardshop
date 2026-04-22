import { Suspense } from 'react';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';

export const metadata: Metadata = {
  title: 'Verificar Correo | Solmaira Cards',
  description: 'Verifica el correo de tu cuenta de Solmaira',
};

export default async function BuyerVerifyEmailPage() {
  await getSession();

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <VerifyEmailForm portal="buy" />
    </Suspense>
  );
}
