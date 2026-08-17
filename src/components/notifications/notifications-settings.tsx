'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spinner } from '@/components/ui/spinner';
import { Send, MessageCircle, Link2, Package, Check, Bell } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { updateNotificationPreferences, sendTestPush } from '@/actions/notifications';
import { useAction } from 'next-safe-action/hooks';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import type { SubscribedBrandCountry } from '@/types';

const SETTINGS_TEXTS = {
  seller: {
    saved: 'Saved',
    errorSaving: 'Error saving',
    howToReceive: 'How to receive Notifications',
    telegramDesc: 'Messages to bot chat',
    linkTelegram: 'Link Telegram from your profile',
    whatsappDesc: 'Direct messages to your number',
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
    phoneLabel: 'Phone number',
    phoneHint: 'E.164 with country code',
    whichBrands: 'Which brands',
    filter: 'Filter',
    enableAll: 'Enable all',
    receivingAll: (n: number) => `Receiving from all your brands (${n})`,
    receivingSome: (n: number, total: number) => `Receiving from ${n} of ${total} brands`,
    brandsHint: 'Brands where you have an assigned rate',
    save: 'Save',
  },
  buyer: {
    saved: 'Guardado',
    errorSaving: 'Error al guardar',
    howToReceive: 'Cómo recibir Notificaciones',
    telegramDesc: 'Mensajes al chat del bot',
    linkTelegram: 'Vinculá Telegram desde tu perfil',
    whatsappDesc: 'Mensajes directos a tu número',
    pushDesc: 'Notificaciones en este navegador',
    pushBlocked: 'Bloqueado por el navegador — habilitalo en la configuración del sitio',
    pushUnsupported: 'Este navegador no soporta notificaciones push',
    pushNotConfigured: 'Push no está configurado en el servidor (faltan claves VAPID)',
    pushBraveHint: 'Brave: activá "Usar servicios de Google para mensajería push" en brave://settings/privacy',
    testPush: 'Enviar notificación de prueba',
    testPushSent: 'Prueba enviada — revisá las notificaciones del navegador',
    testPushNoSubs: 'No se encontraron suscripciones push en este navegador',
    testPushTitle: '🔔 Notificación de prueba',
    testPushBody: 'Si ves esto, el canal Web Push funciona correctamente.',
    phoneLabel: 'Número',
    phoneHint: 'E.164 con código de país',
    whichBrands: 'De qué marcas',
    filter: 'Filtrar',
    enableAll: 'Activar todas',
    receivingAll: (n: number) => `Recibiendo de todas tus marcas (${n})`,
    receivingSome: (n: number, total: number) => `Recibiendo de ${n} de ${total} marcas`,
    brandsHint: 'Marcas donde tenés tarifa asignada',
    save: 'Guardar',
  },
  admin: {
    saved: 'Guardado',
    errorSaving: 'Error al guardar',
    howToReceive: 'Cómo recibir Notificaciones',
    telegramDesc: 'Mensajes al chat del bot',
    linkTelegram: 'Vinculá Telegram desde tu perfil',
    whatsappDesc: 'Mensajes directos a tu número',
    pushDesc: 'Notificaciones en este navegador',
    pushBlocked: 'Bloqueado por el navegador — habilitalo en la configuración del sitio',
    pushUnsupported: 'Este navegador no soporta notificaciones push',
    pushNotConfigured: 'Push no está configurado en el servidor (faltan claves VAPID)',
    pushBraveHint: 'Brave: activá "Usar servicios de Google para mensajería push" en brave://settings/privacy',
    testPush: 'Enviar notificación de prueba',
    testPushSent: 'Prueba enviada — revisá las notificaciones del navegador',
    testPushNoSubs: 'No se encontraron suscripciones push en este navegador',
    testPushTitle: '🔔 Notificación de prueba',
    testPushBody: 'Si ves esto, el canal Web Push funciona correctamente.',
    phoneLabel: 'Número',
    phoneHint: 'E.164 con código de país',
    whichBrands: 'De qué marcas',
    filter: 'Filtrar',
    enableAll: 'Activar todas',
    receivingAll: (n: number) => `Recibiendo de todas tus marcas (${n})`,
    receivingSome: (n: number, total: number) => `Recibiendo de ${n} de ${total} marcas`,
    brandsHint: 'Marcas donde tenés tarifa asignada',
    save: 'Guardar',
  },
} as const;

export interface NotificationsSettingsProps {
  portal: 'buyer' | 'seller' | 'admin';
  telegramLinked: boolean;
  telegramProfileUrl?: string;
  initialPreferences?: {
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    whatsappPhone: string | null;
    pushEnabled: boolean;
  };
  brandCountries?: SubscribedBrandCountry[];
}

export const NotificationsSettings = ({ portal, telegramLinked, telegramProfileUrl, initialPreferences, brandCountries }: NotificationsSettingsProps) => {
  const texts = SETTINGS_TEXTS[portal];
  const [telegramEnabled, setTelegramEnabled] = useState(initialPreferences?.telegramEnabled ?? true);
  const [telegramTouched, setTelegramTouched] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialPreferences?.whatsappEnabled ?? false);
  const [whatsappPhone, setWhatsappPhone] = useState(initialPreferences?.whatsappPhone ?? '');

  const initialSubscribed = brandCountries ? new Set(brandCountries.filter((bc) => bc.subscribed).map((bc) => bc.id)) : new Set<string>();
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(initialSubscribed);

  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; title: string } | null>(null);

  const push = usePushSubscription(initialPreferences?.pushEnabled ?? false);

  const [testPushLoading, setTestPushLoading] = useState(false);

  const handleTestPush = async () => {
    setAlert(null);
    setTestPushLoading(true);
    try {
      const res = await sendTestPush({ title: texts.testPushTitle, description: texts.testPushBody });
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
      whatsappEnabled,
      whatsappPhone: whatsappPhone || null,
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
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
              telegramEnabled && telegramLinked ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
            } ${!telegramLinked ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <Checkbox
              checked={telegramEnabled && telegramLinked}
              disabled={!telegramLinked}
              onCheckedChange={(v) => { setTelegramEnabled(v === true); setTelegramTouched(true); }}
              className="h-5 w-5"
            />
            <MessageCircle className="h-5 w-5 shrink-0 text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Telegram</p>
              <p className="text-muted-foreground text-xs">{texts.telegramDesc}</p>
            </div>
          </label>

          {!telegramLinked && telegramProfileUrl && (
            <Link
              href={telegramProfileUrl}
              className="flex items-center gap-1.5 pl-10 text-xs text-amber-300 hover:text-amber-200 hover:underline"
            >
              <Link2 className="h-3 w-3 shrink-0 text-amber-400" />
              {texts.linkTelegram}
            </Link>
          )}

          {/* WhatsApp */}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
              whatsappEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
            }`}
          >
            <Checkbox checked={whatsappEnabled} onCheckedChange={(v) => setWhatsappEnabled(v === true)} className="h-5 w-5" />
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-500" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.53 0-3.03-.41-4.33-1.19l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.43 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.71-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14 0-.31-.02-.47-.02-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.45 3.74.62.27 1.11.43 1.49.55.63.2 1.2.17 1.65.1.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-muted-foreground text-xs">{texts.whatsappDesc}</p>
            </div>
          </label>

          {whatsappEnabled && (
            <div className="pl-10">
              <Label htmlFor="whatsapp-phone" className="mb-1 block text-xs">
                {texts.phoneLabel}
              </Label>
              <Input
                id="whatsapp-phone"
                type="tel"
                placeholder="+1234567890"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-muted-foreground mt-1 text-[10px]">{texts.phoneHint}</p>
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
