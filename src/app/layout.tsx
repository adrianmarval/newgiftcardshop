import type { Metadata, Viewport } from 'next';
import { Aldrich, Lora, IBM_Plex_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppAlertHost } from '@/components/common';
import { getServerTheme } from '@/lib/ui/theme-utils';

const fontSans = Aldrich({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: '400',
});

const fontSerif = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
});

const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: '400',
});

/*
  Captura GLOBAL de beforeinstallprompt ANTES de React: el evento dispara una
  sola vez, apenas el SW está activo (antes de la hidratación). Cualquier
  listener montado por un componente llega tarde en visitas repetidas y el
  evento NO se re-emite — la install landing (/tg-open) y cualquier futuro CTA
  de instalación in-app consumen window.__pwaInstallPrompt / el evento
  'pwa-installable'.
  Se inyecta como HTML crudo via dangerouslySetInnerHTML (NUNCA next/script ni
  un host element <script> en JSX): en SSR el browser lo parsea y ejecuta
  inline antes de la hidratación; en client renders del RootLayout (ej. el
  boundary raíz unauthorized.tsx en soft-nav) React solo setea innerHTML y no
  ve ningún <script> — next/script beforeInteractive SIEMPRE renderiza un
  script inline y React 19 advierte "Encountered a script tag..." en ese path.
*/
const PWA_INSTALL_CAPTURE_SCRIPT = `<script>
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
  window.dispatchEvent(new Event('pwa-installable'));
});
window.addEventListener('appinstalled', function () {
  window.__pwaInstallPrompt = null;
  window.dispatchEvent(new Event('pwa-installed'));
});
</script>`;

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop',
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  },
  description: `The trusted marketplace for buying and selling gift cards at the best rates with ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  manifest: '/manifests/sell.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-512.png',
  },
  // La UI ya está en el idioma de cada rol (seller EN / buyer ES) — nadie depende
  // de Google Translate. Bloquearlo es la defensa RAÍZ contra los crashes
  // "Failed to execute 'removeChild' on 'Node'": Translate envuelve text nodes
  // en <font> y React/NumberFlow/framer-motion revientan al actualizar el DOM.
  other: { google: 'notranslate' },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getServerTheme();

  return (
    <html lang="en" className={theme} translate="no" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}>
        {/* Captura temprana de beforeinstallprompt — ver PWA_INSTALL_CAPTURE_SCRIPT */}
        <div id="pwa-install-capture" dangerouslySetInnerHTML={{ __html: PWA_INSTALL_CAPTURE_SCRIPT }} />
        <Providers>{children}</Providers>
        <AppAlertHost />
        <Toaster
          position="top-center"
          richColors={false}
          closeButton={false}
          duration={3500}
          swipeDirections={['left', 'right']}
        />
      </body>
    </html>
  );
}