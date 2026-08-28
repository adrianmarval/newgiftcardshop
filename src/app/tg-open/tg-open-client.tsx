'use client';

import Script from 'next/script';
import dynamic from 'next/dynamic';
import type { TgOpenTarget } from './page';
import type { TgOpenContentProps } from './tg-open-content';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        close: () => void;
        openLink: (url: string, options?: { try_browser?: string }) => void;
      };
    };
  }
}

// El contenido depende de window (hash de Mini App, beforeinstallprompt, UA)
// y vive 100% del lado del cliente (ssr: false): el server y el primer render
// del cliente pintan el mismo fallback estático, y el contenido real se monta
// DESPUÉS de la hidratación. Cualquier setState de detección que dispare
// durante la ventana de hidratación concurrente de React 19 aborta el árbol
// ("Hydration failed" recoverable, verificado en Telegram Web weba) — con
// ssr:false ese sub-árbol ni siquiera participa en la hidratación.
const TgOpenContent = dynamic<TgOpenContentProps>(
  () => import('./tg-open-content').then((m) => m.TgOpenContent),
  {
    ssr: false,
    loading: () => <div className="h-32 animate-pulse rounded-xl bg-muted/40 px-8" aria-hidden />,
  },
);

export function TgOpenClient({ target, intentInstall }: { target: TgOpenTarget; intentInstall: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => window.Telegram?.WebApp?.ready()}
      />
      <TgOpenContent target={target} intentInstall={intentInstall} />
    </main>
  );
}
