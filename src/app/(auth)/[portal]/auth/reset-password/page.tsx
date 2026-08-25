import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { redirectIfAuthenticated } from '@/lib/auth/authorization';
import { isAppSection, PORTAL_AUTH_CONFIG } from '@/types';

interface PageProps {
  params: Promise<{ portal: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal } = await params;
  if (!isAppSection(portal)) return {};
  const config = PORTAL_AUTH_CONFIG[portal];
  return {
    title: `${config.resetPasswordTitle} | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
    description: `Crea una nueva contraseña en ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  };
}

export default async function DynamicResetPasswordPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();
  await redirectIfAuthenticated();

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordForm portal={portal} />
    </Suspense>
  );
}