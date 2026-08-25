import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { redirectIfAuthenticated } from '@/lib/auth/authorization';
import { isAppSection, PORTAL_AUTH_CONFIG } from '@/types';

interface PageProps {
  params: Promise<{ portal: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal } = await params;
  if (!isAppSection(portal)) return {};
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop';
  const labels: Record<string, string> = {
    admin: 'Admin',
    buy: 'Comprador',
    sell: 'Vendedor',
  };
  return {
    title: `Iniciar Sesión — ${labels[portal]} | ${appName}`,
  };
}

export default async function DynamicLoginPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();
  await redirectIfAuthenticated();
  const config = PORTAL_AUTH_CONFIG[portal];
  const basePath = `/${portal}/auth`;

  return (
    <Suspense fallback={<div>{portal === 'sell' ? 'Loading...' : 'Cargando...'}</div>}>
      <LoginForm
        portal={portal}
        forgotPasswordUrl={`${basePath}/forgot-password`}
        emailPlaceholder={config.login.emailPlaceholder}
        registerUrl={config.hasRegister ? `${basePath}/register` : undefined}
        registerPrompt={config.login.registerPrompt}
        registerLinkText={config.login.registerLinkText}
      />
    </Suspense>
  );
}