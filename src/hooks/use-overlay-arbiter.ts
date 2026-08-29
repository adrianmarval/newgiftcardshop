// ─────────────────────────────────────────────────────────────────────────────
// use-overlay-arbiter — Zustand store
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { create } from 'zustand';

/**
 * Overlays bloqueantes conocidos que NO pueden coexistir. driver.js activa
 * `.driver-active * { pointer-events: none }` y su overlay tapa cualquier
 * dialog de Radix (z-50): si el tour arranca con un prompt abierto, los
 * botones del prompt quedan muertos y un click/ESC cierra ambos sin que el
 * usuario responda. Este store es el contrato explícito de exclusión mutua
 * (reemplaza la coordinación implícita por timing).
 */
export type BlockingOverlayId = 'push-prompt' | 'tour';

interface OverlayArbiterState {
  activeOverlay: BlockingOverlayId | null;
  /** Toma el slot si está libre (o ya es del mismo id). Devuelve si tuvo éxito. */
  claim: (id: BlockingOverlayId) => boolean;
  /** Libera el slot solo si es del id que lo tenía. */
  release: (id: BlockingOverlayId) => void;
}

export const useOverlayArbiter = create<OverlayArbiterState>((set, get) => ({
  activeOverlay: null,
  claim: (id) => {
    const current = get().activeOverlay;
    if (current !== null && current !== id) return false;
    if (current !== id) set({ activeOverlay: id });
    return true;
  },
  release: (id) => {
    if (get().activeOverlay === id) set({ activeOverlay: null });
  },
}));
