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
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop';
  const labels: Record<string, string> = {
    buy: 'Regístrate',
    sell: 'Become a Seller',
  };
  return {
    title: `${labels[portal] || 'Register'} | ${appName}`,
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
      />
    </Suspense>
  );
}