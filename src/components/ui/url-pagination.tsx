'use client';

import { useQueryState, parseAsInteger } from 'nuqs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const pageParser = parseAsInteger
  .withDefault(1)
  .withOptions({ shallow: false });

const LABELS = {
  es: { previous: 'Anterior', next: 'Siguiente', page: 'Página', of: 'de' },
  en: { previous: 'Previous', next: 'Next', page: 'Page', of: 'of' },
} as const;

interface UrlPaginationProps {
  totalPages: number;
  locale?: 'es' | 'en';
}

export function UrlPagination({ totalPages, locale = 'es' }: UrlPaginationProps) {
  const [page, setPage] = useQueryState('page', pageParser);
  const labels = LABELS[locale];
  const currentPage = page ?? 1;

  const handlePrevious = () => {
    if (currentPage > 1) setPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setPage(currentPage + 1);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1">
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
