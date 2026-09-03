import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // Router cache del cliente para páginas dinámicas (default 0 = CADA
    // soft-nav pega un roundtrip RSC completo → la app se sentía "pesada").
    // 30s matchea el staleTime de React Query: la frescura fina la da el SSE
    // (invalidación dirigida), y las vistas query-based refetchean en mount
    // si su data está stale. Lo peor que puede pasar: un fragmento
    // server-rendered no migrado muestra data de hace ≤30s.
    staleTimes: {
      dynamic: 30,
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
