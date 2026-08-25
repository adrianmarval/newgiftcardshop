import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
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
    title: `${config.forgotPasswordTitle} | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
    description: `Restablece la contraseña de tu cuenta en ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  };
}

export default async function DynamicForgotPasswordPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();
  await redirectIfAuthenticated();

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ForgotPasswordForm portal={portal} />
    </Suspense>
  );
}