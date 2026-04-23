// ─────────────────────────────────────────────────────────────────────────────
// Buy Flow — Giftcard selection logic for browse
// Server-only types for the gift card selection algorithm.
// IMPORTANTE: NO importar en Client Components.
// ─────────────────────────────────────────────────────────────────────────────

import type { Giftcard } from '@/generated/prisma/client';
import type { Decimal } from '@prisma/client/runtime/client';

// ── browse-giftcards ──────────────────────────────────────────────────────────

/**
 * Resultado de la selección de gift cards para una orden de compra.
 * Used by browse-giftcards.ts para determinar qué cards seleccionar.
 */
export interface GiftcardSelectionResult {
  /** Cards seleccionados para la orden. */
  selectedCards: Giftcard[];
  /** Valor total de los cards seleccionados (Decimal para precisión). */
  total: Decimal;
  /** Si la selección matcheó exactamente el monto target. */
  isExactMatch: boolean;
  /** Si la selección está dentro del tolerance range configurado. */
  isWithinToleranceRange: boolean;
}

/**
 * Información de un batch para preprocesamiento.
 * Útil para implementar estrategias de selección basadas en antiguedad.
 */
export interface BatchInfo {
  createdAt: Date;
  cards: Giftcard[];
  totalValue: Decimal;
}

/**
 * Datos preprocesados de múltiples batches para gift card selection.
 * Contiene batches ordenados por antiguedad y todos los cards agrupados.
 */
export interface PreprocessedBatchData {
  /** Info de cada batch disponible. */
  batches: BatchInfo[];
  /** Todos los cards ordenados por antiguedad (más viejos primero). */
  allCardsByAge: Giftcard[];
  /** Cantidad total de cards disponibles. */
  totalCards: number;
}
