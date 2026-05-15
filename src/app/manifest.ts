import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Solmaira GiftCardShop',
    short_name: process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop',
    description: `La mejor tienda de tarjetas de regalo de ${process.env.NEXT_PUBLIC_APP_NAME || 'Solmaira GiftCardShop'}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
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
    ],
  };
}
