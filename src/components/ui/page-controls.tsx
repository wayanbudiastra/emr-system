"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageControlsProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function PageControls({ page, totalPages, total, limit, onPageChange }: PageControlsProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
      <p className="text-xs text-muted-foreground">
        {total === 0 ? "Tidak ada data" : `${from}–${to} dari ${total} data`}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={page === 1} onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          {getPages().map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="px-1 text-xs text-muted-foreground select-none">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon" className="h-7 w-7 text-xs"
                onClick={() => onPageChange(p as number)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={page === totalPages} onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
