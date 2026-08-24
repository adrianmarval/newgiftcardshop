'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet } from 'lucide-react';
import { SETTING_GROUPS, SETTING_KEYS } from '@/lib/settings';
import { formatCurrency } from '@/lib/utils';
import { AIProvidersManager } from './ai-providers-manager';
import { SettingsSection } from './settings-section';
import type { AIProviderConfigResponse } from '@/lib/ai-provider-config';

interface ConfigManagerProps {
  initialValues: Record<string, unknown>;
  initialAIProviders: AIProviderConfigResponse[];
}

export function ConfigManager({ initialValues, initialAIProviders }: ConfigManagerProps) {
  const balance = Number(initialValues[SETTING_KEYS.PLATFORM_BALANCE] ?? 0);

  return (
    <div className="mx-auto w-full space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm">Administra los parámetros operativos de la plataforma.</p>
      </div>

      {/* ── Balance de plataforma (solo lectura) ── */}
      <Card>
        <CardHeader>
          <CardTitle>{SETTING_GROUPS.platform.title}</CardTitle>
          <CardDescription>{SETTING_GROUPS.platform.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <Wallet className="text-muted-foreground size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Balance disponible</p>
                <p className="text-muted-foreground text-xs">Se modifica automáticamente con depósitos, reembolsos y pagos a sellers.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight tabular-nums">{formatCurrency(balance)}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/dashboard/payments">
                  Movimientos
                  <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SettingsSection groupId="payments" initialValues={initialValues} />
      <SettingsSection groupId="escalation" initialValues={initialValues} />

      {/* ── Proveedores de IA ── */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Proveedores de IA</h2>
          <p className="text-muted-foreground text-sm">Modelos usados para extracción de códigos (OCR).</p>
        </div>
        <AIProvidersManager initialProviders={initialAIProviders} />
      </section>
    </div>
  );
}
