'use client';

import { CheckCircle2, XCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { PromptDrawer } from '@/components/common/prompt-drawer';
import { useAlertStore, type AlertVariant } from '@/lib/ui/alert-store';

const VARIANT_ICON: Record<AlertVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-400' },
  error: { icon: XCircle, className: 'bg-red-500/10 text-red-400' },
  warning: { icon: AlertTriangle, className: 'bg-amber-500/10 text-amber-400' },
  info: { icon: Info, className: 'bg-blue-500/10 text-blue-400' },
  confirm: { icon: HelpCircle, className: 'bg-primary/10 text-primary' },
};

/**
 * Host global de alertas — renderiza la cola de alert-store como Drawer (mobile)
 * o Dialog (desktop). Montar UNA vez en el root layout.
 */
export function AppAlertHost() {
  const current = useAlertStore((s) => s.queue[0]);
  const dismiss = useAlertStore((s) => s.dismiss);

  if (!current) return null;

  const { icon: Icon, className } = VARIANT_ICON[current.variant];
  const isConfirm = current.variant === 'confirm';

  return (
    <PromptDrawer
      open
      onOpenChange={(open) => {
        if (!open) dismiss(current.id, false);
      }}
      icon={<Icon className="h-6 w-6" />}
      iconClassName={className}
      title={current.title}
      description={current.content}
      primaryAction={{
        label: current.confirmText ?? (isConfirm ? 'Confirmar' : 'Entendido'),
        onClick: () => dismiss(current.id, true),
        danger: current.danger,
      }}
      secondaryAction={
        isConfirm
          ? { label: current.cancelText ?? 'Cancelar', onClick: () => dismiss(current.id, false) }
          : undefined
      }
    />
  );
}
