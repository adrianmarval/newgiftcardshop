'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spinner } from '@/components/ui/spinner';
import { Send, MessageCircle, Package, Check, Bell } from 'lucide-react';
import Image from 'next/image';
import { updateNotificationPreferences, sendTestPush } from '@/actions/notifications';
import { generateTelegramLink } from '@/actions/auth/generate-telegram-link';
import { useAction } from 'next-safe-action/hooks';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import type { SubscribedBrandCountry } from '@/types';

const SETTINGS_TEXTS = {
  seller: {
    saved: 'Saved',
    errorSaving: 'Error saving',
    howToReceive: 'How to receive Notifications',
    telegramDesc: 'Messages to bot chat',
    linkTelegramTitle: 'Link your Telegram',
    linkTelegramDesc: 'Connect your account to receive notifications in the bot chat.',
    linkTelegramCta: 'Link Telegram',
    linkTelegramHint: 'Once linked, refresh this page to enable the channel.',
    linkTelegramError: 'Could not generate the link. Try again.',
    pushDesc: 'Notifications in this browser',
    pushBlocked: 'Blocked by the browser — enable it in the site settings',
    pushUnsupported: 'This browser does not support push notifications',
    pushNotConfigured: 'Push is not configured on the server (missing VAPID keys)',
    pushBraveHint: 'Brave: enable "Use Google services for push messaging" in brave://settings/privacy',
    testPush: 'Send test notification',
    testPushSent: 'Test sent — check your browser notifications',
    testPushNoSubs: 'No push subscriptions found for this browser',
    testPushTitle: '🔔 Test notification',
    testPushBody: 'If you see this, the Web Push channel works correctly.',
    whichBrands: 'Which brands',
    filter: 'Filter',
    enableAll: 'Enable all',
    receivingAll: (n: number) => `Receiving from all your brands (${n})`,
    receivingSome: (n: number, total: number) => `Receiving from ${n} of ${total} brands`,
    brandsHint: 'Brands where you have an assigned rate',
    stockDigestHint: 'Stock alerts arrive on Telegram/Push as a periodic summary (frequency depends on the brand). In the app they arrive instantly.',
    save: 'Save',
  },
  buyer: {
    saved: 'Guardado',
    errorSaving: 'Error al guardar',
    howToReceive: 'Cómo recibir Notificaciones',
    telegramDesc: 'Mensajes al chat del bot',
    linkTelegramTitle: 'Vincula tu Telegram',
    linkTelegramDesc: 'Conecta tu cuenta para recibir notificaciones en el chat del bot.',
    linkTelegramCta: 'Vincular Telegram',
    linkTelegramHint: 'Una vez vinculado, actualiza esta página para activar el canal.',
    linkTelegramError: 'No se pudo generar el link. Intenta de nuevo.',
    pushDesc: 'Notificaciones en este navegador',
    pushBlocked: 'Bloqueado por el navegador — habilítalo en la configuración del sitio',
    pushUnsupported: 'Este navegador no soporta notificaciones push',
    pushNotConfigured: 'Push no está configurado en el servidor (faltan claves VAPID)',
    pushBraveHint: 'Brave: activa "Usar servicios de Google para mensajería push" en brave://settings/privacy',
    testPush: 'Enviar notificación de prueba',
    testPushSent: 'Prueba enviada — revisa las notificaciones del navegador',
    testPushNoSubs: 'No se encontraron suscripciones push en este navegador',
    testPushTitle: '🔔 Notificación de prueba',
    testPushBody: 'Si ves esto, el canal Web Push funciona correctamente.',
    whichBrands: 'De qué marcas',
    filter: 'Filtrar',
    enableAll: 'Activar todas',
    receivingAll: (n: number) => `Recibiendo de todas tus marcas (${n})`,
    receivingSome: (n: number, total: number) => `Recibiendo de ${n} de ${total} marcas`,
    brandsHint: 'Marcas donde tienes tarifa asignada',
    stockDigestHint: 'Las alertas de stock llegan a Telegram/Push como un resumen periódico (la frecuencia depende de la marca). En la app llegan al instante.',
    save: 'Guardar',
  },
  admin: {
    saved: 'Guardado',
    errorSaving: 'Error al guardar',
    howToReceive: 'Cómo recibir Notificaciones',
    telegramDesc: 'Mensajes al chat del bot',
    linkTelegramTitle: 'Vincula tu Telegram',
    linkTelegramDesc: 'Conecta tu cuenta para recibir notificaciones en el chat del bot.',
    linkTelegramCta: 'Vincular Telegram',
    linkTelegramHint: 'Una vez vinculado, actualiza esta página para activar el canal.',
    linkTelegramError: 'No se pudo generar el link. Intenta de nuevo.',
    pushDesc: 'Notificaciones en este navegador',
    pushBlocked: 'Bloqueado por el navegador — habilítalo en la configuración del sitio',
    pushUnsupported: 'Este navegador no soporta notificaciones push',
    pushNotConfigured: 'Push no está configurado en el servidor (faltan claves VAPID)',
    pushBraveHint: 'Brave: activa "Usar servicios de Google para mensajería push" en brave://settings/privacy',
    testPush: 'Enviar notificación de prueba',
    testPushSent: 'Prueba enviada — revisa las notificaciones del navegador',
    testPushNoSubs: 'No se encontraron suscripciones push en este navegador',
    testPushTitle: '🔔 Notificación de prueba',
    testPushBody: 'Si ves esto, el canal Web Push funciona correctamente.',
    whichBrands: 'De qué marcas',
    filter: 'Filtrar',
    enableAll: 'Activar todas',
    receivingAll: (n: number) => `Recibiendo de todas tus marcas (${n})`,
    receivingSome: (n: number, total: number) => `Recibiendo de ${n} de ${total} marcas`,
    brandsHint: 'Marcas donde tienes tarifa asignada',
    stockDigestHint: 'Las alertas de stock llegan a Telegram/Push como un resumen periódico (la frecuencia depende de la marca). En la app llegan al instante.',
    save: 'Guardar',
  },
} as const;

export interface NotificationsSettingsProps {
  portal: 'buyer' | 'seller' | 'admin';
  telegramLinked: boolean;
  initialPreferences?: {
    telegramEnabled: boolean;
    pushEnabled: boolean;
  };
  brandCountries?: SubscribedBrandCountry[];
}

export const NotificationsSettings = ({ portal, telegramLinked, initialPreferences, brandCountries }: NotificationsSettingsProps) => {
  const texts = SETTINGS_TEXTS[portal];
  const [telegramEnabled, setTelegramEnabled] = useState(initialPreferences?.telegramEnabled ?? true);
  const [telegramTouched, setTelegramTouched] = useState(false);

  const initialSubscribed = brandCountries ? new Set(brandCountries.filter((bc) => bc.subscribed).map((bc) => bc.id)) : new Set<string>();
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(initialSubscribed);

  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; title: string } | null>(null);

  const push = usePushSubscription(initialPreferences?.pushEnabled ?? false);

  const [testPushLoading, setTestPushLoading] = useState(false);

  const { execute: executeGenerateLink, status: generateLinkStatus } = useAction(generateTelegramLink, {
    onSuccess: ({ data }) => {
      if (data && 'deepLink' in data && data.deepLink) {
        window.open(data.deepLink, '_blank');
        setAlert(null);
      } else {
        setAlert({ variant: 'error', title: (data && 'error' in data && data.error) || texts.linkTelegramError });
      }
    },
    onError: () => {
      setAlert({ variant: 'error', title: texts.linkTelegramError });
    },
  });

  const handleTestPush = async () => {
    setAlert(null);
    setTestPushLoading(true);
    try {
      const res = await sendTestPush({ title: texts.testPushTitle, description: texts.testPushBody, portal });
      const data = res?.data;
      if (data?.status === 'sent') {
        setAlert({ variant: 'success', title: texts.testPushSent });
      } else if (data?.status === 'skipped') {
        setAlert({ variant: 'error', title: data.reason === 'no_push_subscriptions' ? texts.testPushNoSubs : texts.pushNotConfigured });
      } else {
        setAlert({ variant: 'error', title: data?.error || res?.serverError || texts.errorSaving });
      }
    } finally {
      setTestPushLoading(false);
    }
  };

  const handleTogglePush = async (enabled: boolean) => {
    setAlert(null);
    if (enabled) {
      const result = await push.enable();
      if (!result.ok) {
        console.error('[Push] Error al habilitar:', result.error);
        setAlert({
          variant: 'error',
          title:
            result.error === 'permission_denied'
              ? texts.pushBlocked
              : result.error === 'vapid_not_configured'
                ? texts.pushNotConfigured
                : result.error === 'brave_push_service_disabled'
                  ? texts.pushBraveHint
                  : texts.errorSaving,
        });
      }
    } else {
      await push.disable();
    }
  };

  const { execute, status } = useAction(updateNotificationPreferences, {
    onSuccess: ({ data }) => {
      const result = data as { success?: boolean; error?: string } | undefined;
      if (result?.success) {
        setAlert({ variant: 'success', title: texts.saved });
        setTimeout(() => setAlert(null), 3000);
      } else {
        setAlert({ variant: 'error', title: result?.error || texts.errorSaving });
      }
    },
    onError: ({ error }) => {
      setAlert({ variant: 'error', title: error.serverError || texts.errorSaving });
    },
  });

  const handleSave = () => {
    setAlert(null);
    execute({
      ...(telegramTouched ? { telegramEnabled } : {}),
      ...(brandCountries ? { subscribedBrandCountryIds: [...subscribedIds] } : {}),
    });
  };

  const toggleBrandCountry = (id: string) => {
    setSubscribedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!brandCountries) return;
    setSubscribedIds(new Set(brandCountries.map((bc) => bc.id)));
  };

  const clearAll = () => {
    setSubscribedIds(new Set());
  };

  const isSaving = status === 'executing';
  const allSelected = subscribedIds.size === 0;

  return (
    <Card>
      <CardContent className="space-y-5 p-4 md:p-6">
        {alert && (
          <InlineAlert variant={alert.variant} title={alert.title} autoDismiss dismissAfter={3000} onDismiss={() => setAlert(null)} />
        )}

        {/* ── Cómo recibir Notificaciones ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Send className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-semibold">{texts.howToReceive}</h3>
          </div>

          {/* Telegram */}
          {telegramLinked ? (
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                telegramEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
              }`}
            >
              <Checkbox
                checked={telegramEnabled}
                onCheckedChange={(v) => { setTelegramEnabled(v === true); setTelegramTouched(true); }}
                className="h-5 w-5"
              />
              <MessageCircle className="h-5 w-5 shrink-0 text-blue-400" />
              <div className="flex-1">
                <p className="text-sm font-medium">Telegram</p>
                <p className="text-muted-foreground text-xs">{texts.telegramDesc}</p>
              </div>
            </label>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <MessageCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{texts.linkTelegramTitle}</p>
                  <p className="text-muted-foreground text-xs">{texts.linkTelegramDesc}</p>
                </div>
              </div>
              <Button
                onClick={() => executeGenerateLink()}
                disabled={generateLinkStatus === 'executing'}
                size="sm"
                className="self-start bg-blue-500 text-white hover:bg-blue-400"
              >
                {generateLinkStatus === 'executing' ? <Spinner size="sm" className="text-white" /> : texts.linkTelegramCta}
              </Button>
              <p className="text-muted-foreground/70 text-[11px]">{texts.linkTelegramHint}</p>
            </div>
          )}

          {/* Web Push — se aplica de inmediato (requiere permiso del navegador) */}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
              push.subscribed ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
            } ${!push.supported || push.permission === 'denied' ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <Checkbox
              checked={push.subscribed}
              disabled={!push.supported || push.permission === 'denied' || push.loading}
              onCheckedChange={(v) => handleTogglePush(v === true)}
              className="h-5 w-5"
            />
            <Bell className="h-5 w-5 shrink-0 text-violet-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Push</p>
              <p className="text-muted-foreground text-xs">{texts.pushDesc}</p>
            </div>
            {push.loading && <Spinner size="sm" />}
          </label>

          {push.subscribed && (
            <div className="pl-10">
              <button
                onClick={handleTestPush}
                disabled={testPushLoading}
                className="text-primary flex items-center gap-1.5 text-xs font-medium hover:underline disabled:opacity-50"
              >
                {testPushLoading && <Spinner size="sm" />}
                {texts.testPush}
              </button>
            </div>
          )}

          {push.supported && push.permission === 'denied' && (
            <p className="pl-10 text-xs text-amber-300">{texts.pushBlocked}</p>
          )}
          {!push.supported && (
            <p className="text-muted-foreground pl-10 text-xs">{texts.pushUnsupported}</p>
          )}
        </section>

        {/* ── De qué marcas recibir Notificaciones (buyers) ── */}
        {portal === 'buyer' && brandCountries && brandCountries.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="text-muted-foreground h-4 w-4" />
                <h3 className="text-sm font-semibold">{texts.whichBrands}</h3>
              </div>
              <button onClick={allSelected ? clearAll : selectAll} className="text-primary text-xs font-medium hover:underline">
                {allSelected ? texts.filter : texts.enableAll}
              </button>
            </div>

            <p className="text-muted-foreground text-xs">
              {allSelected
                ? texts.receivingAll(brandCountries.length)
                : texts.receivingSome(subscribedIds.size, brandCountries.length)}
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {brandCountries.map((bc) => {
                const isSelected = subscribedIds.has(bc.id);
                return (
                  <button
                    key={bc.id}
                    onClick={() => toggleBrandCountry(bc.id)}
                    className={`relative flex items-center gap-2 rounded-xl border p-2 transition-all ${
                      isSelected ? 'border-primary/40 bg-primary/5' : 'border-border opacity-40 hover:opacity-80'
                    }`}
                  >
                    {isSelected && (
                      <div className="bg-primary absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full">
                        <Check className="text-primary-foreground h-2.5 w-2.5" strokeWidth={3} />
                      </div>
                    )}
                    <div className="bg-card relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg dark:bg-white">
                      {bc.brandImage ? (
                        <Image src={bc.brandImage} alt={bc.brandName} fill className="object-contain p-0.5" sizes="28px" />
                      ) : (
                        <span className="text-sm">{bc.brandIcon}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[11px] font-semibold md:text-xs">{bc.brandName}</p>
                      <p className="text-muted-foreground truncate text-[9px]">{bc.countryName}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-muted-foreground/60 text-[10px]">{texts.brandsHint}</p>
            <p className="text-muted-foreground/60 text-[10px]">{texts.stockDigestHint}</p>
          </section>
        )}

        {/* ── Guardar ── */}
        <div className="flex justify-end pt-1">
          <Button onClick={handleSave} disabled={isSaving} className="h-9 px-6 text-sm">
            {isSaving ? <Spinner size="sm" className="text-white" /> : texts.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
