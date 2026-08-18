import type { Metadata, Viewport } from 'next';
import { Aldrich, Lora, IBM_Plex_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { Providers } from '@/components/providers';
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
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          richColors={false}
          closeButton={false}
          duration={Infinity}
          swipeDirections={['left', 'right']}
        />
      </body>
    </html>
  );
}