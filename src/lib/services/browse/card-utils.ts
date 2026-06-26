import { Giftcard } from '@/generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

/** Verifica si un total está dentro del rango [target - tolerance, target] */
export function isWithinTolerance(total: Decimal, target: Decimal, toleranceRange: Decimal): boolean {
  return total.gte(target.sub(toleranceRange)) && total.lte(target);
}

/** Obtiene la fecha más reciente de un conjunto de tarjetas seleccionadas */
export function getLatestBatchDate(cards: Giftcard[]): Date {
  return cards.reduce((latest, card) => {
    const cardDate = new Date(card.createdAt);
    return cardDate > latest ? cardDate : latest;
  }, new Date(0));
}

/** Compara si una combinación es "más antigua" que otra (promedio de fechas) */
export function isOlderCombination(combo1: Giftcard[], combo2: Giftcard[]): boolean {
  const avg = (combo: Giftcard[]) => combo.reduce((sum, card) => sum + new Date(card.createdAt).getTime(), 0) / combo.length;
  return avg(combo1) < avg(combo2);
}
