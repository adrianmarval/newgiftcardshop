import { toast } from 'sonner';
import type { ReactNode } from 'react';
import { enqueueAlert, type AlertVariant } from './alert-store';

export interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  /** Botón primario destructivo (acciones irreversibles: eliminar, etc.) */
  danger?: boolean;
}

/**
 * Alertas imperativas de la app — reemplazo de SweetAlert.
 * Bloqueantes (success/error/warning/info/confirm) → host adaptativo Drawer (mobile) / Dialog (desktop).
 * Toasts → sonner.
 * Uso idéntico al anterior showAlert; NO importar SweetAlert.
 */
export const showAlert = {
  success: (title: string, text?: string) => enqueueAlert({ variant: 'success', title, content: text }),

  error: (title: string, text?: string) => enqueueAlert({ variant: 'error', title, content: text }),

  warning: (title: string, text?: string) => enqueueAlert({ variant: 'warning', title, content: text }),

  info: (title: string, text?: string) => enqueueAlert({ variant: 'info', title, content: text }),

  /** Resuelve true si el usuario confirma, false si cancela o cierra. */
  confirm: async (title: string, text: ReactNode, opts?: ConfirmOptions) => {
    return enqueueAlert({
      variant: 'confirm',
      title,
      content: text,
      confirmText: opts?.confirmText,
      cancelText: opts?.cancelText,
      danger: opts?.danger,
    });
  },

  /** Alerta bloqueante con contenido JSX custom (listas, datos formateados, etc.) */
  custom: (variant: Exclude<AlertVariant, 'confirm'>, title: string, content: ReactNode, opts?: ConfirmOptions) =>
    enqueueAlert({ variant, title, content, confirmText: opts?.confirmText }),

  toast: {
    success: (title: string, text?: string) => toast.success(title, { description: text }),
    error: (title: string, text?: string) => toast.error(title, { description: text }),
    warning: (title: string, text?: string) => toast.warning(title, { description: text }),
    info: (title: string, text?: string) => toast.info(title, { description: text }),
  },
};
