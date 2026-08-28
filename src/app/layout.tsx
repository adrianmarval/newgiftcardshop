import type { Metadata, Viewport } from 'next';
import { Aldrich, Lora, IBM_Plex_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import Script from 'next/script';
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getServerTheme();

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}>
        {/*
          Captura GLOBAL de beforeinstallprompt ANTES de React: el evento
          dispara una sola vez, apenas el SW está activo (antes de la
          hidratación). Cualquier listener montado por un componente llega
          tarde en visitas repetidas y el evento NO se re-emite — la install
          landing (/tg-open) y cualquier futuro CTA de instalación in-app
          consumen window.__pwaInstallPrompt / el evento 'pwa-installable'.
        */}
        <Script id="pwa-install-capture" strategy="beforeInteractive">
          {`
            window.addEventListener('beforeinstallprompt', function (e) {
              e.preventDefault();
              window.__pwaInstallPrompt = e;
              window.dispatchEvent(new Event('pwa-installable'));
            });
            window.addEventListener('appinstalled', function () {
              window.__pwaInstallPrompt = null;
              window.dispatchEvent(new Event('pwa-installed'));
            });
          `}
        </Script>
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