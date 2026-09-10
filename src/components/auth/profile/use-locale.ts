'use client';

import { usePathname } from 'next/navigation';

export function useLocale() {
  const pathname = usePathname();
  const isSpanish = pathname.includes('/admin') || pathname.includes('/buy');
  return { isSpanish, locale: isSpanish ? 'es' : 'en' };
}
