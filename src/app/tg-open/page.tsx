import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TgOpenClient } from './tg-open-client';

const ALLOWED_TARGETS = ['/sell/dashboard', '/store/dashboard'] as const;
export type TgOpenTarget = (typeof ALLOWED_TARGETS)[number];

const MANIFEST_MAP: Record<TgOpenTarget, string> = {
  '/sell/dashboard': '/manifests/sell.webmanifest',
  '/store/dashboard': '/manifests/buy.webmanifest',
};

interface TgOpenSearchParams {
  to?: string;
  intent?: string;
}

// CRÍTICO: el root layout declara el manifest de SELL. Sin este override, un
// buyer que instale la PWA desde esta página instalaría la app equivocada
// (id /sell/dashboard, scope /sell).
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<TgOpenSearchParams>;
}): Promise<Metadata> {
  const { to } = await searchParams;
  if (to && (ALLOWED_TARGETS as readonly string[]).includes(to)) {
    return { manifest: MANIFEST_MAP[to as TgOpenTarget] };
  }
  return {};
}

/**
 * Página trampolín para los bots de Telegram: el botón "Install App" del bot
 * es un botón `web_app` (Mini App) que abre esta página. Los botones `url`
 * SIEMPRE abren en el WebView in-app de Telegram (la Bot API no permite
 * forzar browser externo) y los WebViews no pueden instalar PWAs
 * (`beforeinstallprompt` no existe ahí). El flujo es:
 *
 * 1. Mini App (hash #tgWebAppData): botón "Install" →
 *    `Telegram.WebApp.openLink(<target>?intent=install, { try_browser: 'chrome' })`
 *    abre esta MISMA página en Chrome/Safari externo (requiere tap del usuario).
 * 2. Browser externo con ?intent=install: install landing — captura
 *    `beforeinstallprompt` y ofrece el diálogo nativo de instalación.
 *    En iOS (sin beforeinstallprompt) muestra las instrucciones manuales.
 * 3. Browser directo SIN intent: redirect al destino (comportamiento de link).
 */
export default async function TgOpenPage({ searchParams }: { searchParams: Promise<TgOpenSearchParams> }) {
  const { to, intent } = await searchParams;

  // Anti open-redirect: solo destinos conocidos del mismo origen
  if (!to || !(ALLOWED_TARGETS as readonly string[]).includes(to)) {
    redirect('/');
  }

  return <TgOpenClient target={to as TgOpenTarget} intentInstall={intent === 'install'} />;
}
