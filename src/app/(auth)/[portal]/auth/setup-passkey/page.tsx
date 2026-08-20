import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth/auth-server';
import prisma from '@/lib/prisma';
import { PasskeySetupView } from '@/components/auth/passkey/passkey-setup-view';
import { isAppSection, dashboardMap } from '@/types';

interface PageProps {
  params: Promise<{ portal: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal } = await params;
  if (!isAppSection(portal)) return {};
  const isSpanish = portal === 'buy' || portal === 'admin';
  return {
    title: `${isSpanish ? 'Configura tu passkey' : 'Set up your passkey'} | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  };
}

/**
 * Vista intersticial post-login para registrar una passkey.
 *
 * Self-guarding: cualquier entrada indebida (sin sesión o con passkeys ya
 * registradas) redirige sin renderizar — esto permite que el flujo de 2FA
 * también aterrice aquí sin checks extra.
 */
export default async function SetupPasskeyPage({ params }: PageProps) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();

  const dashboard = dashboardMap[portal];

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(`/${portal}/auth/login`);

  const passkeyCount = await prisma.passkey.count({ where: { userId: session.user.id } });
  if (passkeyCount > 0) redirect(dashboard);

  return <PasskeySetupView portal={portal} />;
}
