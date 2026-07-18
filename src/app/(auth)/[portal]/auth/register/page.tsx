import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { isAppSection, PORTAL_AUTH_CONFIG } from '@/types';

interface PageProps {
  params: Promise<{ portal: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal } = await params;
  if (!isAppSection(portal)) return {};
  const _config = PORTAL_AUTH_CONFIG[portal];
  const isBuy = portal === 'buy';
  return {
    title: isBuy
      ? `Regístrate | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`
      : `Become a Seller | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
    description: isBuy
      ? `Crea tu cuenta de comprador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`
      : `Create a seller account on ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  };
}

export default async function DynamicRegisterPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();
  const config = PORTAL_AUTH_CONFIG[portal];
  if (!config.register) notFound();

  const basePath = `/${portal}/auth`;

  return (
    <Suspense fallback={<div>{portal === 'sell' ? 'Loading...' : 'Cargando...'}</div>}>
      <RegisterForm
        portal={portal}
        redirectTo={`/${portal}/auth/login`}
        loginUrl={`${basePath}/login`}
        title={config.register.title}
        subtitle={config.register.subtitle}
      />
    </Suspense>
  );
}