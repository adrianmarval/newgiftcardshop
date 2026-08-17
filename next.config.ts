import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@whiskeysockets/baileys'],

  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  allowedDevOrigins: ['dev.giftcardshop.app', '*.trycloudflare.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.telegram.org',
      },
    ],
  },
};

export default nextConfig;
