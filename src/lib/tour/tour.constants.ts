// ─────────────────────────────────────────────────────────────────────────────
// Onboarding tours (driver.js) — Constantes compartidas
// ─────────────────────────────────────────────────────────────────────────────

import type { Config } from 'driver.js';

export const TOUR_IDS = ['sell-dashboard', 'sell-wizard', 'sell-batches', 'buy-dashboard', 'buy-wizard', 'buy-orders'] as const;
export type TourId = (typeof TOUR_IDS)[number];

/** Idioma de la UI por portal: sellers EN, buyers ES. */
export type TourPortal = 'seller' | 'buyer';

export const TOUR_POPOVER_CLASS = 'app-tour';

export const BASE_DRIVER_CONFIG = {
  showProgress: true,
  progressText: '{{current}} / {{total}}',
  animate: true,
  smoothScroll: true,
  stagePadding: 8,
  stageRadius: 12,
  popoverClass: TOUR_POPOVER_CLASS,
  allowClose: true,
  overlayClickBehavior: 'close',
  overlayOpacity: 0.7,
} satisfies Partial<Config>;

export const TOUR_BUTTON_TEXTS: Record<TourPortal, Pick<Config, 'nextBtnText' | 'prevBtnText' | 'doneBtnText'>> = {
  seller: { nextBtnText: 'Next', prevBtnText: 'Back', doneBtnText: 'Got it' },
  buyer: { nextBtnText: 'Siguiente', prevBtnText: 'Atrás', doneBtnText: 'Listo' },
};
