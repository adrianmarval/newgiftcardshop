'use client';

import type { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';

export interface PromptDrawerAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
  /** Estilo destructivo para acciones irreversibles */
  danger?: boolean;
}

export interface PromptDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  iconClassName?: string;
  title: string;
  description?: ReactNode;
  primaryAction: PromptDrawerAction;
  secondaryAction?: PromptDrawerAction;
  tertiaryAction?: PromptDrawerAction;
}

/**
 * Prompt adaptativo para preguntas/consentimientos al usuario (opt-ins, confirmaciones).
 * Mobile (<1024px): bottom Drawer. Desktop: Dialog centrado.
 * Usar para cualquier prompt tipo "¿querés activar X?" — NO SweetAlert ni toasts improvisados.
 */
export function PromptDrawer({
  open,
  onOpenChange,
  icon,
  iconClassName,
  title,
  description,
  primaryAction,
  secondaryAction,
  tertiaryAction,
}: PromptDrawerProps) {
  const isMobile = useIsMobile();

  const iconNode = icon && (
    <div className={`bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconClassName ?? ''}`}>
      {icon}
    </div>
  );

  const actions = (
    <>
      <Button
        onClick={primaryAction.onClick}
        disabled={primaryAction.loading}
        variant={primaryAction.danger ? 'destructive' : 'default'}
        className="w-full"
      >
        {primaryAction.loading ? <Spinner size="sm" className="text-white" /> : primaryAction.label}
      </Button>
      {secondaryAction && (
        <Button onClick={secondaryAction.onClick} variant="outline" className="w-full">
          {secondaryAction.label}
        </Button>
      )}
      {tertiaryAction && (
        <button
          onClick={tertiaryAction.onClick}
          className="text-muted-foreground hover:text-foreground mx-auto mt-1 text-xs transition-colors"
        >
          {tertiaryAction.label}
        </button>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="gap-2">
            {iconNode}
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription className="max-w-sm">{description}</DrawerDescription>}
          </DrawerHeader>
          <DrawerFooter>{actions}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-3 p-6 text-center sm:max-w-sm">
        <DialogHeader className="items-center gap-2">
          {iconNode}
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-2">{actions}</div>
      </DialogContent>
    </Dialog>
  );
}
