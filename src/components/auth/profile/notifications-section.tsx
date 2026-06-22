'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spinner } from '@/components/ui/spinner';
import { Bell, MessageCircle, Link2 } from 'lucide-react';
import { updateNotificationPreferences } from '@/actions';
import { useAction } from 'next-safe-action/hooks';
import { AppSection } from '@/types';

export interface NotificationsSectionProps {
  portal: AppSection;
  telegramLinked: boolean;
  initialPreferences?: {
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    whatsappPhone: string | null;
  };
}

export const NotificationsSection = ({
  portal,
  telegramLinked,
  initialPreferences,
}: NotificationsSectionProps) => {
  const pathname = usePathname();
  const isSpanish = pathname.includes('/admin') || pathname.includes('/buy');

  const [telegramEnabled, setTelegramEnabled] = useState(initialPreferences?.telegramEnabled ?? true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialPreferences?.whatsappEnabled ?? false);
  const [whatsappPhone, setWhatsappPhone] = useState(initialPreferences?.whatsappPhone ?? '');
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; title: string; description?: string } | null>(null);

  const { execute, status } = useAction(updateNotificationPreferences, {
    onSuccess: ({ data }) => {
      const result = data as { success?: boolean; error?: string } | undefined;
      if (result?.success) {
        setAlert({
          variant: 'success',
          title: isSpanish ? 'Preferencias guardadas' : 'Preferences saved',
        });
        setTimeout(() => setAlert(null), 3000);
      } else {
        setAlert({
          variant: 'error',
          title: result?.error || (isSpanish ? 'Error al guardar' : 'Failed to save'),
        });
      }
    },
    onError: ({ error }) => {
      setAlert({
        variant: 'error',
        title: error.serverError || (isSpanish ? 'Error al guardar' : 'Failed to save'),
      });
    },
  });

  const handleSave = () => {
    setAlert(null);
    execute({
      telegramEnabled,
      whatsappEnabled,
      whatsappPhone: whatsappPhone || null,
    });
  };

  const isSaving = status === 'executing';

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center gap-1 space-y-0 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 md:h-9 md:w-9 md:rounded-lg">
          <Bell className="h-3.5 w-3.5 text-primary md:h-4 md:w-4" />
        </div>
        <div>
          <CardTitle className="text-sm md:text-lg">
            {isSpanish ? 'Notificaciones' : 'Notifications'}
          </CardTitle>
          <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
            {isSpanish ? 'Elegí cómo recibir alertas' : 'Choose how to receive alerts'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {alert && (
          <InlineAlert
            variant={alert.variant}
            title={alert.title}
            description={alert.description}
            autoDismiss
            dismissAfter={4000}
            onDismiss={() => setAlert(null)}
          />
        )}

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="telegram-notif"
              checked={telegramEnabled}
              disabled={!telegramLinked}
              onCheckedChange={(checked) => setTelegramEnabled(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
                <Label htmlFor="telegram-notif" className="text-xs font-semibold md:text-sm">
                  Telegram
                </Label>
              </div>
              <p className="text-muted-foreground text-xs">
                {isSpanish
                  ? 'Recibí alertas por mensaje de Telegram'
                  : 'Receive alerts via Telegram message'}
              </p>
            </div>
          </div>

          {!telegramLinked && (
            <div className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 p-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">
                {isSpanish
                  ? 'Vinculá Telegram para habilitar este canal'
                  : 'Link Telegram to enable this channel'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="whatsapp-notif"
              checked={whatsappEnabled}
              onCheckedChange={(checked) => setWhatsappEnabled(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-0.5">
              <Label htmlFor="whatsapp-notif" className="text-xs font-semibold md:text-sm">
                WhatsApp
              </Label>
              <p className="text-muted-foreground text-xs">
                {isSpanish
                  ? 'Recibí alertas por WhatsApp (próximamente vía Baylis)'
                  : 'Receive alerts via WhatsApp (soon via Baylis)'}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="whatsapp-phone" className="text-xs font-medium text-slate-300">
              {isSpanish ? 'Número de WhatsApp' : 'WhatsApp number'}
            </Label>
            <Input
              id="whatsapp-phone"
              type="tel"
              placeholder="+1234567890"
              disabled={!whatsappEnabled}
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              className="h-9 text-sm md:h-10"
            />
            <p className="text-muted-foreground text-[10px]">
              {isSpanish ? 'Formato E.164 con código de país' : 'E.164 format with country code'}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-semibold"
          >
            {isSaving ? <Spinner size="sm" className="text-white" /> : isSpanish ? 'Guardar' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
