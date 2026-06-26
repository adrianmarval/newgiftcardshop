import { Giftcard } from '@/generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import type { GiftcardSelectionResult, BatchInfo, PreprocessedBatchData } from '@/types';
import { isWithinTolerance } from './card-utils';
import { canMakeExactAmount, findExactInBatch } from './dp-solver';

// ─── Constantes ────────────────────────────────────────────────────────────────

const BATCH_GROUP_BY_DAY_THRESHOLD = 3; // Agrupar por día si hay más de cards/N lotes

// ─── Preprocesamiento ──────────────────────────────────────────────────────────

/**
 * Agrupa las tarjetas por lotes cronológicos (mismo createdAt).
 * Si hay demasiados lotes pequeños, agrupa por día para optimizar performance.
 */
export function preprocessCardsByBatches(cards: Giftcard[]): PreprocessedBatchData {
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
export function batchSequentialSelection(data: PreprocessedBatchData, target: Decimal, toleranceRange: Decimal): GiftcardSelectionResult {
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
export function selectFromBatchWithTolerance(batchCards: Giftcard[], targetRemaining: Decimal, toleranceRange: Decimal): GiftcardSelectionResult {
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
