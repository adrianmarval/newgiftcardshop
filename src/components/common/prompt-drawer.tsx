'use client';

import type { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export interface PromptDrawerAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

export interface PromptDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  iconClassName?: string;
  title: string;
  description?: string;
  primaryAction: PromptDrawerAction;
  secondaryAction?: PromptDrawerAction;
  tertiaryAction?: PromptDrawerAction;
}

/**
 * Bottom drawer para preguntas/consentimientos al usuario (opt-ins, confirmaciones suaves).
 * Reemplaza toasts improvisados — usar para cualquier prompt tipo "¿querés activar X?".
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
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="gap-2">
          {icon && (
            <div className={`bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full ${iconClassName ?? ''}`}>
              {icon}
            </div>
          )}
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription className="max-w-sm">{description}</DrawerDescription>}
        </DrawerHeader>
        <DrawerFooter>
          <Button onClick={primaryAction.onClick} disabled={primaryAction.loading} className="w-full">
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
