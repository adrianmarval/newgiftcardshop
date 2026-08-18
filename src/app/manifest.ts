import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Solmaira GiftCardShop';

type PanelConfig = {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
};

const PANELS: Record<string, PanelConfig> = {
  store: {
    id: '/store/dashboard',
    name: `${APP_NAME} — Store`,
    short_name: 'Store',
    start_url: '/store/dashboard',
  },
  sell: {
    id: '/sell/dashboard',
    name: `${APP_NAME} — Sell`,
    short_name: 'Sell',
    start_url: '/sell/dashboard',
  },
  admin: {
    id: '/admin/dashboard',
    name: `${APP_NAME} — Admin`,
    short_name: 'Admin',
    start_url: '/admin/dashboard',
  },
};

function detectPanel(pathname: string): PanelConfig | null {
  if (pathname.startsWith('/sell/')) return PANELS.sell;
  if (pathname.startsWith('/admin/')) return PANELS.admin;
  if (pathname.startsWith('/store/')) return PANELS.store;
  return null;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers();
  const referer = headersList.get('referer') || '';

  let panel: PanelConfig | null = null;
  try {
    const url = new URL(referer);
    panel = detectPanel(url.pathname);
  } catch {
    // referer inválido o ausente — fallback a root
  }

  const icons: MetadataRoute.Manifest['icons'] = [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
  ];

  const shortcutIcons: MetadataRoute.Manifest['icons'] = [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
  ];

  const shortcuts: MetadataRoute.Manifest['shortcuts'] = [
    {
      name: 'Buy Cards',
      short_name: 'Buy',
      url: '/store/dashboard',
      icons: shortcutIcons,
    },
    {
      name: 'Sell Cards',
      short_name: 'Sell',
      url: '/sell/dashboard',
      icons: shortcutIcons,
    },
    {
      name: 'Admin Panel',
      short_name: 'Admin',
      url: '/admin/dashboard',
      icons: shortcutIcons,
    },
  ];

  if (panel) {
    return {
      name: panel.name,
      short_name: panel.short_name,
      description: `${APP_NAME} — ${panel.short_name} panel`,
      id: panel.id,
      start_url: panel.start_url,
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons,
      shortcuts,
    };
  }

  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: `La mejor tienda de tarjetas de regalo de ${APP_NAME}`,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons,
    shortcuts,
  };
}
