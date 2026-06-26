import { Giftcard } from '@/generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import type { GiftcardSelectionResult, GiftcardSelectionWithTierInfo } from '@/types';
import { preprocessCardsByBatches, batchSequentialSelection } from './batch-preprocessor';
import { optimizeBatchSelection } from './dp-solver';
import { isOlderCombination } from './card-utils';

// ─── Constantes ────────────────────────────────────────────────────────────────

const TOLERANCE_RANGE = new Decimal(5);
const MAX_TARGET_AMOUNT = 10000;

// ─── Función principal ─────────────────────────────────────────────────────────

/**
 * Algoritmo optimizado que PRIORIZA LOTES ANTIGUOS con selección secuencial.
 *
 * Reglas:
 * - No exceder el 100% del objetivo
 * - Preferir combinaciones dentro del rango de tolerancia de $5 por debajo
 * - Mantener prioridad estricta por antigüedad de lotes
 * - Filtrar tarjetas por denominación mínima/máxima
 * - Filtrar tarjetas por tier de escalación (buyerBuyRate)
 *
 * @param cards - Lista de tarjetas disponibles
 * @param targetPurchaseAmount - Monto objetivo de compra
 * @param buyerBuyRate - Tasa de compra del buyer (para filtrar por tier)
 * @param minamount - Monto mínimo de tarjeta
 * @param maxamount - Monto máximo de tarjeta (opcional)
 * @returns Resultado de selección con información de tier
 */
export function findGiftcardCombination(
  cards: Giftcard[],
  targetPurchaseAmount: number,
  buyerBuyRate: number,
  minamount: Decimal = new Decimal(1),
  maxamount?: Decimal | null,
): GiftcardSelectionWithTierInfo {
  const emptyResult: GiftcardSelectionWithTierInfo = {
    selectedCards: [],
    total: new Decimal(0),
    isExactMatch: false,
    isWithinToleranceRange: false,
    tierInfo: {
      accessibleCards: [],
      inaccessibleCards: [],
      accessibleAmount: new Decimal(0),
      inaccessibleAmount: new Decimal(0),
      buyerBuyRate,
    },
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

  // Filtrar por tier de escalación
  const accessibleCards = availableCards.filter((card) => {
    const tier = card.escalationTier;
    return tier <= buyerBuyRate;
  });

  const inaccessibleCards = availableCards.filter((card) => {
    const tier = card.escalationTier;
    return tier > buyerBuyRate;
  });

  // Calcular montos por tier
  let accessibleAmount = new Decimal(0);
  for (const card of accessibleCards) {
    accessibleAmount = accessibleAmount.add(card.amount);
  }

  let inaccessibleAmount = new Decimal(0);
  for (const card of inaccessibleCards) {
    inaccessibleAmount = inaccessibleAmount.add(card.amount);
  }

  // Si no hay tarjetas accesibles, retornar con info de tiers
  if (accessibleCards.length === 0) {
    return {
      ...emptyResult,
      tierInfo: {
        accessibleCards: [],
        inaccessibleCards,
        accessibleAmount: new Decimal(0),
        inaccessibleAmount,
        buyerBuyRate,
      },
    };
  }

  const target = new Decimal(targetPurchaseAmount);

  // Preprocesar datos agrupando por lotes cronológicos (solo tarjetas accesibles)
  const batchData = preprocessCardsByBatches(accessibleCards);

  // Estrategia 1: Selección secuencial por lotes antiguos
  const batchSequentialResult = batchSequentialSelection(batchData, target, TOLERANCE_RANGE);

  // Agregar tierInfo al resultado
  const addTierInfo = (result: GiftcardSelectionResult): GiftcardSelectionWithTierInfo => ({
    ...result,
    tierInfo: {
      accessibleCards,
      inaccessibleCards,
      accessibleAmount,
      inaccessibleAmount,
      buyerBuyRate,
    },
  });

  if (batchSequentialResult.isExactMatch) {
    return addTierInfo(batchSequentialResult);
  }

  // Estrategia 2: Optimización inteligente manteniendo prioridad por lotes
  const optimizedResult = optimizeBatchSelection(batchData, batchSequentialResult, target, TOLERANCE_RANGE);

  return addTierInfo(selectBestResult(batchSequentialResult, optimizedResult, target, TOLERANCE_RANGE));
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
