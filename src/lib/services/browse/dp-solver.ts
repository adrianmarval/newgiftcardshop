import { Giftcard } from '@/generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import type { GiftcardSelectionResult, PreprocessedBatchData } from '@/types';
import { isOlderCombination, isWithinTolerance, getLatestBatchDate } from './card-utils';
import { logger } from '@/lib/logger';

// ─── Constantes ────────────────────────────────────────────────────────────────

const TOLERANCE_RANGE = new Decimal(5);
const MAX_CARDS_EXACT_SEARCH = 30; // Consistente en todas las funciones
const MAX_DP_TARGET = 10000;

/** Suma los amounts REALES (Decimal, con centavos) de una selección de tarjetas. */
function sumRealAmounts(cards: Giftcard[]): Decimal {
  return cards.reduce((sum, card) => sum.add(card.amount), new Decimal(0));
}

// ─── Programación dinámica ─────────────────────────────────────────────────────

/**
 * Verifica (rápido, sin reconstrucción de path) si es posible
 * formar un monto exacto con las tarjetas disponibles.
 */
export function canMakeExactAmount(cards: Giftcard[], amount: Decimal): boolean {
  if (!cards || cards.length === 0) return false;
  if (amount.lte(0) || amount.gt(MAX_DP_TARGET)) return false;

  const targetAmount = amount.floor().toNumber();

  try {
    const dp = new Array<boolean>(targetAmount + 1).fill(false);
    dp[0] = true;

    for (const card of cards.slice(0, MAX_CARDS_EXACT_SEARCH)) {
      if (!card || card.amount.lte(0)) continue;

      const cardValue = card.amount.floor().toNumber();
      if (cardValue <= 0 || cardValue > targetAmount) continue;

      for (let i = targetAmount; i >= cardValue; i--) {
        if (dp[i - cardValue]) {
          dp[i] = true;
          if (i === targetAmount) return true;
        }
      }
    }

    return dp[targetAmount];
  } catch (error) {
    logger.warn('Error en canMakeExactAmount', {
      flow: 'buy',
      action: 'card-combination',
      metadata: { amount: amount.toString(), targetAmount, cardsLength: cards.length },
      error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) },
    });
    return false;
  }
}

/**
 * Busca la mejor combinación (exacta o aproximada) dentro de un lote
 * usando programación dinámica (subset-sum con reconstrucción de path).
 */
export function findExactInBatch(batchCards: Giftcard[], target: Decimal): GiftcardSelectionResult {
  const emptyResult: GiftcardSelectionResult = {
    selectedCards: [],
    total: new Decimal(0),
    isExactMatch: false,
    isWithinToleranceRange: false,
  };

  if (target.lte(0) || target.gt(MAX_DP_TARGET)) {
    logger.warn('findExactInBatch: target inválido', { flow: 'buy', action: 'card-combination', metadata: { target: target.toString() } });
    return emptyResult;
  }

  if (!batchCards || batchCards.length === 0) return emptyResult;

  const safeTarget = target.floor().abs().toNumber();
  const searchCards = batchCards.slice(0, MAX_CARDS_EXACT_SEARCH);

  try {
    const dp: (Giftcard[] | null)[] = new Array(safeTarget + 1).fill(null);
    dp[0] = [];

    for (const card of searchCards) {
      if (!card || card.amount.lte(0)) continue;

      // ✅ CORRECCIÓN: renombrado de `amount` a `cardValue` para evitar shadowing
      const cardValue = card.amount.floor().toNumber();
      if (cardValue <= 0 || cardValue > safeTarget) continue;

      // ✅ CORRECCIÓN: variable del loop renombrada a `j` en lugar de `amount`
      for (let j = safeTarget; j >= cardValue; j--) {
        if (dp[j - cardValue] !== null) {
          const newCombination = [...(dp[j - cardValue] || []), card];

          if (
            dp[j] === null ||
            dp[j]!.length > newCombination.length ||
            (dp[j]!.length === newCombination.length && isOlderCombination(newCombination, dp[j]!))
          ) {
            dp[j] = newCombination;
          }
        }
      }
    }

    // Resultado exacto (a nivel floored) — el DP opera sobre amounts FLOREADOS,
    // así que hay que recomputar la suma REAL: puede exceder el target en centavos
    // (ej. 2×$25.99 floorea a 25+25=50 pero suma $51.98). Nunca devolver una
    // combinación cuyo total real supere el target — el buyer pagaría de más.
    if (dp[safeTarget] !== null) {
      const selected = dp[safeTarget]!;
      const realTotal = sumRealAmounts(selected);
      if (realTotal.lte(target)) {
        return {
          selectedCards: selected,
          total: realTotal,
          isExactMatch: realTotal.equals(target),
          isWithinToleranceRange: true,
        };
      }
      // Si la suma real excede el target, caer a la aproximación por debajo.
      // (Otra combinación con el mismo floored-sum podría ser válida, pero el DP
      // conserva una sola por suma — tradeoff aceptado: nunca cobrar de más.)
    }

    // Mejor aproximación por debajo (dentro del rango de tolerancia)
    const lowerBound = Math.max(0, safeTarget - TOLERANCE_RANGE.toNumber());

    for (let j = safeTarget - 1; j >= lowerBound; j--) {
      if (dp[j] !== null) {
        const selected = dp[j]!;
        const realTotal = sumRealAmounts(selected);
        // Con n cards, la suma real puede superar el floored-sum en casi n dólares
        // — revalidar contra el target real antes de aceptar.
        if (realTotal.gt(0) && realTotal.lte(target)) {
          return {
            selectedCards: selected,
            total: realTotal,
            isExactMatch: realTotal.equals(target),
            isWithinToleranceRange: true,
          };
        }
      }
    }

    return emptyResult;
  } catch (error) {
    logger.warn('Error en findExactInBatch', {
      flow: 'buy',
      action: 'card-combination',
      metadata: { target: target.toString(), safeTarget, cardsLength: batchCards.length },
      error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) },
    });
    return emptyResult;
  }
}

// ─── Estrategia 2: Optimización ───────────────────────────────────────────────

/**
 * Intenta mejorar el resultado de la estrategia 1 buscando en lotes posteriores.
 * - Si el resultado actual está en rango: busca solo coincidencia exacta.
 * - Si está por debajo del rango: busca cualquier mejora válida.
 */
export function optimizeBatchSelection(
  data: PreprocessedBatchData,
  currentResult: GiftcardSelectionResult,
  target: Decimal,
  toleranceRange: Decimal,
): GiftcardSelectionResult {
  if (currentResult.selectedCards.length === 0 || currentResult.isExactMatch) {
    return currentResult;
  }

  const gap = target.sub(currentResult.total);
  if (gap.lte(0)) return currentResult;

  const usedCardIds = new Set(currentResult.selectedCards.map((c) => c.id));
  const lastUsedBatchDate = getLatestBatchDate(currentResult.selectedCards);

  for (const batch of data.batches) {
    if (batch.createdAt <= lastUsedBatchDate) continue;

    const availableCards = batch.cards.filter((card) => !usedCardIds.has(card.id));
    if (availableCards.length === 0) continue;

    if (currentResult.isWithinToleranceRange) {
      // Solo buscar coincidencia exacta para completar el gap
      const exactMatch = findExactInBatch(availableCards, gap);
      if (exactMatch.isExactMatch) {
        const newTotal = currentResult.total.add(exactMatch.total);
        return {
          selectedCards: [...currentResult.selectedCards, ...exactMatch.selectedCards],
          total: newTotal,
          isExactMatch: newTotal.equals(target),
          isWithinToleranceRange: true,
        };
      }
    } else {
      // Buscar cualquier mejora que no exceda el objetivo
      const improvement = findBestImprovementInBatch(availableCards, gap, toleranceRange);
      if (improvement.total.gt(0) && currentResult.total.add(improvement.total).lte(target)) {
        const newTotal = currentResult.total.add(improvement.total);
        return {
          selectedCards: [...currentResult.selectedCards, ...improvement.selectedCards],
          total: newTotal,
          isExactMatch: newTotal.equals(target),
          isWithinToleranceRange: isWithinTolerance(newTotal, target, toleranceRange),
        };
      }
    }
  }

  return currentResult;
}

/**
 * Busca la mejor tarjeta individual (o combinación exacta) en un lote
 * que esté dentro del gap permitido.
 */
export function findBestImprovementInBatch(cards: Giftcard[], gap: Decimal, toleranceRange: Decimal): GiftcardSelectionResult {
  const emptyResult: GiftcardSelectionResult = {
    selectedCards: [],
    total: new Decimal(0),
    isExactMatch: false,
    isWithinToleranceRange: false,
  };

  // Priorizar combinación exacta
  const exactMatch = findExactInBatch(cards, gap);
  if (exactMatch.isExactMatch) return exactMatch;

  // Buscar la tarjeta individual más alta dentro del rango
  let best = emptyResult;
  const lowerBound = gap.sub(toleranceRange);

  for (const card of cards.slice(0, MAX_CARDS_EXACT_SEARCH)) {
    if (card.amount.lte(gap) && card.amount.gte(lowerBound) && card.amount.gt(best.total)) {
      best = {
        selectedCards: [card],
        total: card.amount,
        isExactMatch: card.amount.equals(gap),
        isWithinToleranceRange: true,
      };
    }
  }

  return best;
}
