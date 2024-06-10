import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import 'animate.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Giftcards Shop',
  description: 'Tienda de venta de tarjetas de regalo',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
