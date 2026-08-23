import { create } from 'zustand';
import type { ReactNode } from 'react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertItem {
  id: number;
  variant: AlertVariant;
  title: string;
  /** Texto plano o JSX — reemplaza el `html:` de SweetAlert */
  content?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Botón primario en estilo destructivo (acciones irreversibles) */
  danger?: boolean;
  resolve: (confirmed: boolean) => void;
}

interface AlertStoreState {
  queue: AlertItem[];
  push: (item: AlertItem) => void;
  dismiss: (id: number, confirmed: boolean) => void;
}

let nextId = 1;

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  queue: [],
  push: (item) => set((s) => ({ queue: [...s.queue, item] })),
  dismiss: (id, confirmed) => {
    const item = get().queue.find((a) => a.id === id);
    set((s) => ({ queue: s.queue.filter((a) => a.id !== id) }));
    item?.resolve(confirmed);
  },
}));

/** API imperativa — usable fuera de React. La promise resuelve al cerrar la alerta. */
export function enqueueAlert(input: Omit<AlertItem, 'id' | 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    useAlertStore.getState().push({ ...input, id: nextId++, resolve });
  });
}
