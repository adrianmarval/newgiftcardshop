import { Suspense } from 'react';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';

export const metadata: Metadata = {
  title: `Verificar Correo | Portal Admin | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: `Verifica el correo de tu cuenta de administrador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
};

export default async function AdminVerifyEmailPage() {
  await getSession();

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <VerifyEmailForm portal="admin" />
    </Suspense>
  );
}
