import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@whiskeysockets/baileys'],
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  allowedDevOrigins: ['192.168.1.173', '*.trycloudflare.com'],
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
