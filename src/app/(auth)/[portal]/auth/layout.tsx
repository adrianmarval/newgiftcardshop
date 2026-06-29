import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { AuthLayout } from '@/components/layout/auth-layout';
import { isAppSection, PORTAL_AUTH_CONFIG } from '@/types';

export default async function DynamicAuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal } = await params;
  if (!isAppSection(portal)) notFound();
  const config = PORTAL_AUTH_CONFIG[portal];

  return (
    <AuthLayout
      bgColor={config.theme.bgColor}
      gradientFrom={config.theme.gradientFrom}
      gradientVia={config.theme.gradientVia}
      blobBg={config.theme.blobBg}
      accentText={config.theme.accentText}
      title={config.theme.title}
      subtitle={config.theme.subtitle}
    >
      {children}
    </AuthLayout>
  );
}