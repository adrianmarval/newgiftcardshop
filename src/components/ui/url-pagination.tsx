"use client";

import { useQueryState } from "nuqs";
import { parseAsInteger } from "nuqs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import type { UrlPaginationProps } from "@/types";

const pageParser = parseAsInteger.withDefault(1);

export function UrlPagination({ totalPages }: UrlPaginationProps) {
  const pathname = usePathname();
  const portal = pathname?.includes("/buy") ? "buy" : "sell";
  const [page, setPage] = useQueryState("page", pageParser);

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
    <div className="flex items-center justify-center gap-4 pt-4">
      <Button
        variant="outline"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        className="border-border font-bold uppercase tracking-wider text-xs"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        {portal === "buy" ? "Anterior" : "Previous"}
      </Button>
      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        {portal === "buy" ? "Página" : "Page"} {currentPage} {portal === "buy" ? "de" : "of"} {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="border-border font-bold uppercase tracking-wider text-xs"
      >
        {portal === "buy" ? "Siguiente" : "Next"}
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
