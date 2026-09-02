import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  allowedDevOrigins: ['giftcardshop.app', '*.trycloudflare.com'],
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
