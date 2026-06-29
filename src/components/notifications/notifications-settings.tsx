'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Spinner } from '@/components/ui/spinner';
import { Send, MessageCircle, Link2, Package, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { updateNotificationPreferences } from '@/actions/notifications';
import { useAction } from 'next-safe-action/hooks';
import type { SubscribedBrandCountry } from '@/types';

export interface NotificationsSettingsProps {
  portal: 'buyer' | 'seller' | 'admin';
  telegramLinked: boolean;
  telegramProfileUrl?: string;
  initialPreferences?: {
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    whatsappPhone: string | null;
  };
  brandCountries?: SubscribedBrandCountry[];
}

export const NotificationsSettings = ({ portal, telegramLinked, telegramProfileUrl, initialPreferences, brandCountries }: NotificationsSettingsProps) => {
  const [telegramEnabled, setTelegramEnabled] = useState(initialPreferences?.telegramEnabled ?? true);
  const [telegramTouched, setTelegramTouched] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialPreferences?.whatsappEnabled ?? false);
  const [whatsappPhone, setWhatsappPhone] = useState(initialPreferences?.whatsappPhone ?? '');

  const initialSubscribed = brandCountries ? new Set(brandCountries.filter((bc) => bc.subscribed).map((bc) => bc.id)) : new Set<string>();
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(initialSubscribed);

  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; title: string } | null>(null);

  const { execute, status } = useAction(updateNotificationPreferences, {
    onSuccess: ({ data }) => {
      const result = data as { success?: boolean; error?: string } | undefined;
      if (result?.success) {
        setAlert({ variant: 'success', title: 'Guardado' });
        setTimeout(() => setAlert(null), 3000);
      } else {
        setAlert({ variant: 'error', title: result?.error || 'Error al guardar' });
      }
    },
    onError: ({ error }) => {
      setAlert({ variant: 'error', title: error.serverError || 'Error al guardar' });
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
            <h3 className="text-sm font-semibold">Cómo recibir Notificaciones</h3>
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
              <p className="text-muted-foreground text-xs">Mensajes al chat del bot</p>
            </div>
          </label>

          {!telegramLinked && telegramProfileUrl && (
            <Link
              href={telegramProfileUrl}
              className="flex items-center gap-1.5 pl-10 text-xs text-amber-300 hover:text-amber-200 hover:underline"
            >
              <Link2 className="h-3 w-3 shrink-0 text-amber-400" />
              Vinculá Telegram desde tu perfil
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
              <p className="text-muted-foreground text-xs">Mensajes directos a tu número</p>
            </div>
          </label>

          {whatsappEnabled && (
            <div className="pl-10">
              <Label htmlFor="whatsapp-phone" className="mb-1 block text-xs">
                Número
              </Label>
              <Input
                id="whatsapp-phone"
                type="tel"
                placeholder="+1234567890"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-muted-foreground mt-1 text-[10px]">E.164 con código de país</p>
            </div>
          )}
        </section>

        {/* ── De qué marcas recibir Notificaciones (buyers) ── */}
        {portal === 'buyer' && brandCountries && brandCountries.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="text-muted-foreground h-4 w-4" />
                <h3 className="text-sm font-semibold">De qué marcas</h3>
              </div>
              <button onClick={allSelected ? clearAll : selectAll} className="text-primary text-xs font-medium hover:underline">
                {allSelected ? 'Filtrar' : 'Activar todas'}
              </button>
            </div>

            <p className="text-muted-foreground text-xs">
              {allSelected
                ? `Recibiendo de todas tus marcas (${brandCountries.length})`
                : `Recibiendo de ${subscribedIds.size} de ${brandCountries.length} marcas`}
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

            <p className="text-muted-foreground/60 text-[10px]">Marcas donde tenés tarifa asignada</p>
          </section>
        )}

        {/* ── Guardar ── */}
        <div className="flex justify-end pt-1">
          <Button onClick={handleSave} disabled={isSaving} className="h-9 px-6 text-sm">
            {isSaving ? <Spinner size="sm" className="text-white" /> : 'Guardar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
