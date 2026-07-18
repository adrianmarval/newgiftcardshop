import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { isAppSection, PORTAL_AUTH_CONFIG } from '@/types';

interface PageProps {
  params: Promise<{ portal: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal } = await params;
  if (!isAppSection(portal)) return {};
  const config = PORTAL_AUTH_CONFIG[portal];
  const isBuy = portal === 'buy';
  return {
    title: `${config.login.title} | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
    description: isBuy
      ? `Inicia sesión en tu cuenta de comprador de ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`
      : `${config.login.subtitle} | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  };
}

export default async function DynamicLoginPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();
  const config = PORTAL_AUTH_CONFIG[portal];
  const basePath = `/${portal}/auth`;

  return (
    <Suspense fallback={<div>{portal === 'sell' ? 'Loading...' : 'Cargando...'}</div>}>
      <LoginForm
        portal={portal}
        title={config.login.title}
        subtitle={config.login.subtitle}
        forgotPasswordUrl={`${basePath}/forgot-password`}
        emailPlaceholder={config.login.emailPlaceholder}
        registerUrl={config.hasRegister ? `${basePath}/register` : undefined}
        registerPrompt={config.login.registerPrompt}
        registerLinkText={config.login.registerLinkText}
      />
    </Suspense>
  );
}