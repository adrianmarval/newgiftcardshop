'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePushSubscription } from '@/hooks/use-push-subscription';

const DISMISS_KEY = 'push-prompt-dismissed';

const TOAST_TEXTS = {
  seller: {
    text: 'Enable notifications to stay updated.',
    enable: 'Enable',
    dismiss: 'Hide',
    errorBlocked: 'Blocked by the browser',
    errorGeneric: 'Failed to enable',
  },
  buyer: {
    text: 'Activá las notificaciones.',
    enable: 'Activar',
    dismiss: 'Ocultar',
    errorBlocked: 'Bloqueado por el navegador',
    errorGeneric: 'Error al activar',
  },
  admin: {
    text: 'Activá las notificaciones.',
    enable: 'Activar',
    dismiss: 'Ocultar',
    errorBlocked: 'Bloqueado por el navegador',
    errorGeneric: 'Error al activar',
  },
} as const;

type PortalKey = 'buyer' | 'seller' | 'admin';

const PORTAL_MAP: Record<string, PortalKey> = {
  buy: 'buyer',
  sell: 'seller',
  admin: 'admin',
};

export function PushPromptToast({ portal }: { portal: string }) {
  const texts = TOAST_TEXTS[PORTAL_MAP[portal] || 'buyer'];
  const push = usePushSubscription(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current || !push.supported || push.subscribed) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    shownRef.current = true;
    setVisible(true);
  }, [push.supported, push.subscribed]);

  const handleEnable = async () => {
    setError(null);
    const result = await push.enable();
    if (result.ok) {
      setVisible(false);
    } else {
      setError(result.error === 'permission_denied' ? texts.errorBlocked : texts.errorGeneric);
    }
  };

  const handleDismiss = () => setVisible(false);

  const handleDismissPermanently = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!push.supported || push.subscribed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          className="fixed top-3 right-0 left-0 z-9999 flex justify-center px-4 sm:px-6"
        >
          <div className="bg-card/95 border-border flex w-full max-w-md items-center gap-2 rounded-xl border px-3 py-2 shadow-lg backdrop-blur-md">
            <Bell className="text-primary h-3.5 w-3.5 shrink-0" />

            <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-snug">{error || texts.text}</p>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                onClick={handleEnable}
                disabled={push.loading}
                size="sm"
                className="h-6 shrink-0 rounded-md px-2 text-[11px] font-medium"
              >
                {push.loading ? <Spinner size="sm" className="text-white" /> : texts.enable}
              </Button>
              <Button
                onClick={handleDismissPermanently}
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-6 shrink-0 rounded-md px-1.5 text-[11px]"
              >
                {texts.dismiss}
              </Button>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-0.5 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
