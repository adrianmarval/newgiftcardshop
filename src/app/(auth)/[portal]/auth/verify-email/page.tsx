import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { isAppSection } from '@/types';

interface PageProps {
  params: Promise<{ portal: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal } = await params;
  if (!isAppSection(portal)) return {};
  const isSpanish = portal === 'buy' || portal === 'admin';
  return {
    title: `${isSpanish ? 'Revisa tu Correo' : 'Check Your Email'} | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
    description: isSpanish
      ? 'Te enviamos un enlace de verificación a tu correo electrónico'
      : 'We sent you a verification link to your email',
  };
}

export default async function VerifyEmailPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();

  return (
    <Suspense fallback={<div className="text-center text-slate-400">Cargando...</div>}>
      <VerifyEmailForm portal={portal} />
    </Suspense>
  );
}
