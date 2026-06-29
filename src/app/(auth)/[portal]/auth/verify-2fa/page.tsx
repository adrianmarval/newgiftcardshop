import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Verify2FAForm } from '@/components/auth/verify-2fa-form';
import { isAppSection, PORTAL_AUTH_CONFIG } from '@/types';

interface PageProps {
  params: Promise<{ portal: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal } = await params;
  if (!isAppSection(portal)) return {};
  const config = PORTAL_AUTH_CONFIG[portal];
  return {
    title: `${config.verify2faTitle} | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
    description: 'Verifica tu identidad con autenticación de dos factores',
  };
}

export default async function DynamicVerify2FAPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();
  const config = PORTAL_AUTH_CONFIG[portal];

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <Verify2FAForm portal={portal} />
    </Suspense>
  );
}