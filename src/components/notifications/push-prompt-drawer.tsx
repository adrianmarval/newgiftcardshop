'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { PromptDrawer } from '@/components/common';
import { usePushSubscription } from '@/hooks/use-push-subscription';

const DISMISS_KEY = 'push-prompt-dismissed';

const DRAWER_TEXTS = {
  seller: {
    title: 'Stay in the loop',
    description: 'Enable push notifications to get alerts in this browser when your batches sell, get paid, or need attention.',
    enable: 'Enable push notifications',
    dismiss: 'Not now',
    dismissForever: "Don't show again",
    errorBlocked: 'Notifications are blocked by the browser. Enable them in the site settings and try again.',
    errorGeneric: 'Something went wrong while enabling notifications. Please try again.',
  },
  buyer: {
    title: 'No te pierdas nada',
    description: 'Activa las notificaciones push para recibir alertas en este navegador sobre stock disponible, entrega de códigos y vencimiento de pagos.',
    enable: 'Activar notificaciones push',
    dismiss: 'Ahora no',
    dismissForever: 'No volver a mostrar',
    errorBlocked: 'Las notificaciones están bloqueadas por el navegador. Habilítalas en la configuración del sitio e intenta de nuevo.',
    errorGeneric: 'Ocurrió un error al activar las notificaciones. Intenta de nuevo.',
  },
  admin: {
    title: 'No te pierdas nada',
    description: 'Activa las notificaciones push para recibir alertas en este navegador sobre pagos pendientes y nuevos lotes.',
    enable: 'Activar notificaciones push',
    dismiss: 'Ahora no',
    dismissForever: 'No volver a mostrar',
    errorBlocked: 'Las notificaciones están bloqueadas por el navegador. Habilítalas en la configuración del sitio e intenta de nuevo.',
    errorGeneric: 'Ocurrió un error al activar las notificaciones. Intenta de nuevo.',
  },
} as const;

type PortalKey = 'buyer' | 'seller' | 'admin';

const PORTAL_MAP: Record<string, PortalKey> = {
  buy: 'buyer',
  sell: 'seller',
  admin: 'admin',
};

export function PushPromptDrawer({ portal }: { portal: string }) {
  const texts = DRAWER_TEXTS[PORTAL_MAP[portal] || 'buyer'];
  const push = usePushSubscription(false);
  // 'dismissed' en SSR para evitar leer localStorage en el server; el valor real se corrige en el primer render cliente.
  const [permanentlyDismissed] = useState(() => typeof window === 'undefined' || localStorage.getItem(DISMISS_KEY) === '1');
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = push.supported && !push.subscribed && !permanentlyDismissed && !sessionDismissed;

  const handleEnable = async () => {
    setError(null);
    const result = await push.enable();
    if (result.ok) {
      setSessionDismissed(true);
    } else {
      setError(result.error === 'permission_denied' ? texts.errorBlocked : texts.errorGeneric);
    }
  };

  const handleDismiss = () => setSessionDismissed(true);

  const handleDismissPermanently = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setSessionDismissed(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setSessionDismissed(true);
  };

  if (!push.supported || push.subscribed) return null;

  return (
    <PromptDrawer
      open={open}
      onOpenChange={handleOpenChange}
      icon={<Bell className="h-6 w-6" />}
      title={texts.title}
      description={error || texts.description}
      primaryAction={{ label: texts.enable, onClick: handleEnable, loading: push.loading }}
      secondaryAction={{ label: texts.dismiss, onClick: handleDismiss }}
      tertiaryAction={{ label: texts.dismissForever, onClick: handleDismissPermanently }}
    />
  );
}
