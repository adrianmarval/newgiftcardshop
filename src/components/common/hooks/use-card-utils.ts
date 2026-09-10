'use client';

import { MouseEvent } from 'react';
import { showAlert } from '@/lib/ui';
import type { GiftcardStatus } from '@/generated/prisma/enums';

export function useCardProgress<T extends { giftcards: { isConfirmed: boolean; status: GiftcardStatus }[] }>(item: T) {
  const confirmedCount = item.giftcards.filter((g) => g.isConfirmed).length;
  const totalItems = item.giftcards.length;
  const progressPercentage = totalItems > 0 ? (confirmedCount / totalItems) * 100 : 0;
  return { confirmedCount, totalItems, progressPercentage };
}

export function useCardCurrency(giftcards: { country?: { currency: string | null } | null }[]) {
  return giftcards[0]?.country?.currency || 'USD';
}

export function useCopyId(id: string | number, shareText?: string) {
  return (e: MouseEvent) => {
    e.stopPropagation();
    const textToCopy = shareText || String(id);
    navigator.clipboard.writeText(textToCopy);
    showAlert.toast.success(shareText ? 'Copiado para compartir' : 'ID copiado');
  };
}
