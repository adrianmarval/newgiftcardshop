'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LABELS = {
  es: { previous: 'Anterior', next: 'Siguiente', page: 'Página', of: 'de' },
  en: { previous: 'Previous', next: 'Next', page: 'Page', of: 'of' },
} as const;

interface UrlPaginationProps {
  totalPages: number;
  locale?: 'es' | 'en';
}

export function UrlPagination({ totalPages, locale = 'es' }: UrlPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const labels = LABELS[locale];
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setPage(currentPage + 1);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <Button
        variant="outline"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        className="border-border text-xs font-bold tracking-wider uppercase"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        {labels.previous}
      </Button>
      <span className="text-muted-foreground text-xs font-black tracking-widest uppercase">
        {labels.page} {currentPage} {labels.of} {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="border-border text-xs font-bold tracking-wider uppercase"
      >
        {labels.next}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
