'use client';

import { useQueryState } from 'nuqs';
import { parseAsInteger } from 'nuqs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';

const pageParser = parseAsInteger.withDefault(1);

interface UrlPaginationProps {
  totalPages: number;
}

export const UrlPagination = ({ totalPages }: UrlPaginationProps) => {
  const pathname = usePathname();
  const portal = pathname?.includes('/buy') ? 'buy' : 'sell';
  const [page, setPage] = useQueryState('page', pageParser);

  const currentPage = page ?? 1;

  const handlePrevious = () => {
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setPage(currentPage + 1);
    }
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
        {portal === 'buy' ? 'Anterior' : 'Previous'}
      </Button>
      <span className="text-muted-foreground text-xs font-black tracking-widest uppercase">
        {portal === 'buy' ? 'Página' : 'Page'} {currentPage} {portal === 'buy' ? 'de' : 'of'} {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="border-border text-xs font-bold tracking-wider uppercase"
      >
        {portal === 'buy' ? 'Siguiente' : 'Next'}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};
