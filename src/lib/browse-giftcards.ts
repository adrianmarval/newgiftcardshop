import { Giftcard } from '@/generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import type { GiftcardSelectionResult, BatchInfo, PreprocessedBatchData } from '@/types';

export type { GiftcardSelectionResult };

// ─── Constantes ────────────────────────────────────────────────────────────────

const TOLERANCE_RANGE = new Decimal(5);
const MAX_CARDS_EXACT_SEARCH = 30; // Consistente en todas las funciones
const MAX_TARGET_AMOUNT = 1000;
const MAX_DP_TARGET = 10000;
const BATCH_GROUP_BY_DAY_THRESHOLD = 3; // Agrupar por día si hay más de cards/N lotes

// ─── Función principal ─────────────────────────────────────────────────────────

/**
 * Algoritmo optimizado que PRIORIZA LOTES ANTIGUOS con selección secuencial.
 *
 * Reglas:
 * - No exceder el 100% del objetivo
 * - Preferir combinaciones dentro del rango de tolerancia de $5 por debajo
 * - Mantener prioridad estricta por antigüedad de lotes
 * - Filtrar tarjetas por denominación mínima/máxima
 */
export function findGiftcardCombination(
  cards: Giftcard[],
  targetPurchaseAmount: number,
  minamount: Decimal = new Decimal(1),
  maxamount?: Decimal | null,
): GiftcardSelectionResult {
  const emptyResult: GiftcardSelectionResult = {
    selectedCards: [],
    total: new Decimal(0),
    isExactMatch: false,
    isWithinToleranceRange: false,
  };

  if (
    cards.length === 0 ||
    targetPurchaseAmount <= 0 ||
    targetPurchaseAmount > MAX_TARGET_AMOUNT ||
    !Number.isFinite(targetPurchaseAmount)
  ) {
    return emptyResult;
  }

  const safeMinamount = minamount.gt(0) ? minamount : new Decimal(1);

  // Filtrar solo tarjetas disponibles/válidas
  const availableCards = cards.filter((card) => {
    if (!card.inStock || card.status !== 'UNUSED') return false;

    if (card.amount.lt(safeMinamount)) return false;
    if (maxamount && card.amount.gt(maxamount)) return false;
    return true;
  });

  if (availableCards.length === 0) {
    return emptyResult;
  }

  const target = new Decimal(targetPurchaseAmount);

  // Preprocesar datos agrupando por lotes cronológicos
  const batchData = preprocessCardsByBatches(availableCards);

  // Estrategia 1: Selección secuencial por lotes antiguos
  const batchSequentialResult = batchSequentialSelection(batchData, target, TOLERANCE_RANGE);

  if (batchSequentialResult.isExactMatch) {
    return batchSequentialResult;
  }

  // Estrategia 2: Optimización inteligente manteniendo prioridad por lotes
  const optimizedResult = optimizeBatchSelection(batchData, batchSequentialResult, target, TOLERANCE_RANGE);

  return selectBestResult(batchSequentialResult, optimizedResult, target, TOLERANCE_RANGE);
}

// ─── Preprocesamiento ──────────────────────────────────────────────────────────

/**
 * Agrupa las tarjetas por lotes cronológicos (mismo createdAt).
 * Si hay demasiados lotes pequeños, agrupa por día para optimizar performance.
 */
function preprocessCardsByBatches(cards: Giftcard[]): PreprocessedBatchData {
  const buildBatchMap = (keyFn: (card: Giftcard) => string): Map<string, Giftcard[]> => {
    const map = new Map<string, Giftcard[]>();
    for (const card of cards) {
      const key = keyFn(card);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return map;
  };

  // Intentar agrupación por timestamp exacto primero
  let batchMap = buildBatchMap((card) => card.createdAt.toISOString());

  // Si hay demasiados lotes pequeños, agrupar por día
  if (batchMap.size > cards.length / BATCH_GROUP_BY_DAY_THRESHOLD) {
    batchMap = buildBatchMap((card) => card.createdAt.toISOString().split('T')[0]);
  }

  const batches: BatchInfo[] = Array.from(batchMap.entries())
    .map(([dateStr, batchCards]) => ({
      createdAt: new Date(dateStr),
      cards: [...batchCards].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      totalValue: batchCards.reduce((sum, card) => sum.add(card.amount), new Decimal(0)),
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const allCardsByAge = [...cards].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return { batches, allCardsByAge, totalCards: cards.length };
}

// ─── Estrategia 1: Selección secuencial ───────────────────────────────────────

/**
 * Selección secuencial priorizando lotes antiguos.
 * Procesa cada lote en orden cronológico y acumula tarjetas sin exceder el objetivo.
 */
function batchSequentialSelection(data: PreprocessedBatchData, target: Decimal, toleranceRange: Decimal): GiftcardSelectionResult {
  const selected: Giftcard[] = [];
  let total = new Decimal(0);

  for (const batch of data.batches) {
    if (total.gte(target)) break;

    const remaining = target.sub(total);
    const batchResult = selectFromBatchWithTolerance(batch.cards, remaining, toleranceRange);

    selected.push(...batchResult.selectedCards);
    total = total.add(batchResult.total);

    // Coincidencia exacta: retornar inmediatamente
    if (total.equals(target)) {
      return {
        selectedCards: selected,
        total,
        isExactMatch: true,
        isWithinToleranceRange: true,
      };
    }

    // Dentro del rango de tolerancia: verificar si vale la pena continuar
    if (isWithinTolerance(total, target, toleranceRange)) {
      const nextBatchIndex = data.batches.indexOf(batch) + 1;

      if (nextBatchIndex < data.batches.length) {
        const gap = target.sub(total);
        const nextBatch = data.batches[nextBatchIndex];

        if (canMakeExactAmount(nextBatch.cards, gap)) {
          const exactInNext = findExactInBatch(nextBatch.cards, gap);
          if (exactInNext.isExactMatch) {
            selected.push(...exactInNext.selectedCards);
            return {
              selectedCards: selected,
              total: target,
              isExactMatch: true,
              isWithinToleranceRange: true,
            };
          }
        }
      }

      return {
        selectedCards: selected,
        total,
        isExactMatch: false,
        isWithinToleranceRange: true,
      };
    }

    // Si total excedió el objetivo, revertir este lote y detener
    if (total.gt(target)) {
      selected.splice(selected.length - batchResult.selectedCards.length, batchResult.selectedCards.length);
      total = total.sub(batchResult.total);
      break;
    }

    // Si estamos muy por debajo, continuar con el siguiente lote
  }

  return {
    selectedCards: selected,
    total,
    isExactMatch: total.equals(target),
    isWithinToleranceRange: isWithinTolerance(total, target, toleranceRange),
  };
}

/**
 * Selecciona tarjetas dentro de un lote sin exceder el targetRemaining.
 * Primero intenta greedy; si queda muy por debajo, intenta búsqueda exacta.
 */
function selectFromBatchWithTolerance(batchCards: Giftcard[], targetRemaining: Decimal, toleranceRange: Decimal): GiftcardSelectionResult {
  const selected: Giftcard[] = [];
  let total = new Decimal(0);

  for (let i = 0; i < batchCards.length; i++) {
    const card = batchCards[i];
    const newTotal = total.add(card.amount);

    // Solo agregar si no excedemos el objetivo parcial
    if (newTotal.lte(targetRemaining)) {
      selected.push(card);
      total = newTotal;

      if (total.equals(targetRemaining)) {
        return {
          selectedCards: selected,
          total,
          isExactMatch: true,
          isWithinToleranceRange: true,
        };
      }

      if (isWithinTolerance(total, targetRemaining, toleranceRange)) {
        // Verificar si la siguiente tarjeta da exacto
        const nextCard = batchCards[i + 1];
        if (nextCard && total.add(nextCard.amount).equals(targetRemaining)) {
          selected.push(nextCard);
          return {
            selectedCards: selected,
            total: total.add(nextCard.amount),
            isExactMatch: true,
            isWithinToleranceRange: true,
          };
        }
        return {
          selectedCards: selected,
          total,
          isExactMatch: false,
          isWithinToleranceRange: true,
        };
      }
    }
  }

  // Si el resultado greedy quedó muy por debajo, intentar búsqueda exacta/óptima
  if (total.lt(targetRemaining.sub(toleranceRange))) {
    const exactResult = findExactInBatch(batchCards, targetRemaining);
    const exactTotal = exactResult.total;

    const currentIsWorse =
      exactResult.isExactMatch || (isWithinTolerance(exactTotal, targetRemaining, toleranceRange) && exactTotal.gt(total));

    if (currentIsWorse) {
      return {
        selectedCards: exactResult.selectedCards,
        total: exactTotal,
        isExactMatch: exactResult.isExactMatch,
        isWithinToleranceRange: isWithinTolerance(exactTotal, targetRemaining, toleranceRange),
      };
    }
  }

  return {
    selectedCards: selected,
    total,
    isExactMatch: false,
    isWithinToleranceRange: isWithinTolerance(total, targetRemaining, toleranceRange),
  };
}

// ─── Programación dinámica ─────────────────────────────────────────────────────

/**
 * Verifica (rápido, sin reconstrucción de path) si es posible
 * formar un monto exacto con las tarjetas disponibles.
 */
function canMakeExactAmount(cards: Giftcard[], amount: Decimal): boolean {
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
    console.error('Error en canMakeExactAmount:', {
      amount,
      targetAmount,
      cardsLength: cards.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Busca la mejor combinación (exacta o aproximada) dentro de un lote
 * usando programación dinámica (subset-sum con reconstrucción de path).
 */
function findExactInBatch(batchCards: Giftcard[], target: Decimal): GiftcardSelectionResult {
  const emptyResult: GiftcardSelectionResult = {
    selectedCards: [],
    total: new Decimal(0),
    isExactMatch: false,
    isWithinToleranceRange: false,
  };

  if (target.lte(0) || target.gt(MAX_DP_TARGET)) {
    console.error('findExactInBatch: target inválido', { target });
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

    // Resultado exacto
    if (dp[safeTarget] !== null) {
      return {
        selectedCards: dp[safeTarget]!,
        total: new Decimal(safeTarget),
        isExactMatch: true,
        isWithinToleranceRange: true,
      };
    }

    // Mejor aproximación por debajo (dentro del rango de tolerancia)
    let bestAmount = 0;
    const lowerBound = Math.max(0, safeTarget - TOLERANCE_RANGE.toNumber());

    for (let j = safeTarget - 1; j >= lowerBound; j--) {
      if (dp[j] !== null && j > bestAmount) {
        bestAmount = j;
        break; // El primer encontrado desde arriba es el mejor
      }
    }

    if (bestAmount > 0) {
      return {
        selectedCards: dp[bestAmount]!,
        total: new Decimal(bestAmount),
        isExactMatch: false,
        isWithinToleranceRange: true,
      };
    }

    return emptyResult;
  } catch (error) {
    console.error('Error en findExactInBatch:', {
      target,
      safeTarget,
      cardsLength: batchCards.length,
      error: error instanceof Error ? error.message : String(error),
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
function optimizeBatchSelection(
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
        return {
          selectedCards: [...currentResult.selectedCards, ...exactMatch.selectedCards],
          total: target,
          isExactMatch: true,
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
function findBestImprovementInBatch(cards: Giftcard[], gap: Decimal, toleranceRange: Decimal): GiftcardSelectionResult {
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

// ─── Selección del mejor resultado ────────────────────────────────────────────

/**
 * Compara dos resultados y retorna el mejor según prioridades:
 * 1. Coincidencia exacta
 * 2. Dentro del rango de tolerancia
 * 3. Mayor total sin exceder el objetivo
 * 4. Combinación más antigua
 */
function selectBestResult(
  result1: GiftcardSelectionResult,
  result2: GiftcardSelectionResult,
  target: Decimal,
  toleranceRange: Decimal,
): GiftcardSelectionResult {
  // Descartar resultados que exceden el objetivo
  const r1Valid = result1.total.lte(target);
  const r2Valid = result2.total.lte(target);

  if (!r1Valid && !r2Valid)
    return {
      selectedCards: [],
      total: new Decimal(0),
      isExactMatch: false,
      isWithinToleranceRange: false,
    };
  if (!r1Valid) return result2;
  if (!r2Valid) return result1;

  // Prioridad 1: Coincidencia exacta
  if (result1.isExactMatch !== result2.isExactMatch) {
    return result1.isExactMatch ? result1 : result2;
  }

  // Prioridad 2: Dentro del rango de tolerancia
  if (result1.isWithinToleranceRange !== result2.isWithinToleranceRange) {
    return result1.isWithinToleranceRange ? result1 : result2;
  }

  // Prioridad 3: Mayor total
  if (!result1.total.equals(result2.total)) {
    return result1.total.gt(result2.total) ? result1 : result2;
  }

  // Prioridad 4: Combinación más antigua
  if (result1.selectedCards.length > 0 && result2.selectedCards.length > 0) {
    return isOlderCombination(result1.selectedCards, result2.selectedCards) ? result1 : result2;
  }

  return result1;
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

/** Verifica si un total está dentro del rango [target - tolerance, target] */
function isWithinTolerance(total: Decimal, target: Decimal, toleranceRange: Decimal): boolean {
  return total.gte(target.sub(toleranceRange)) && total.lte(target);
}

/** Obtiene la fecha más reciente de un conjunto de tarjetas seleccionadas */
function getLatestBatchDate(cards: Giftcard[]): Date {
  return cards.reduce((latest, card) => {
    const cardDate = new Date(card.createdAt);
    return cardDate > latest ? cardDate : latest;
  }, new Date(0));
}

/** Compara si una combinación es "más antigua" que otra (promedio de fechas) */
function isOlderCombination(combo1: Giftcard[], combo2: Giftcard[]): boolean {
  const avg = (combo: Giftcard[]) => combo.reduce((sum, card) => sum + new Date(card.createdAt).getTime(), 0) / combo.length;
  return avg(combo1) < avg(combo2);
}
