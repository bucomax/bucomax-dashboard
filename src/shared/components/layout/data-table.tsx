"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

/* ─── Filters bar ─── */

export function DataTableFilters({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 ring-1 ring-foreground/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─── Root wrapper ─── */

export function DataTableRoot({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─── Scrollable area (horizontal on mobile) ─── */

export function DataTableScroll({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>{children}</div>
  );
}

/* ─── Header row ─── */

export function DataTableHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="row"
      className={cn(
        "text-muted-foreground border-b bg-muted/50 px-4 py-2 text-xs font-medium",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ─── Body ─── */

export function DataTableBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul className={cn("divide-y", className)}>{children}</ul>
  );
}

/* ─── Row ─── */

export function DataTableRow({
  className,
  children,
}: React.LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn("px-4 py-3 text-sm", className)}>{children}</li>
  );
}

/* ─── Empty state ─── */

export function DataTableEmpty({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="text-muted-foreground px-4 py-8 text-center text-sm">
      {children}
    </div>
  );
}

/* ─── Footer with pagination ─── */

export type DataTablePaginationProps = {
  page: number;
  totalPages?: number;
  from?: number;
  to?: number;
  total?: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  /** e.g. "Mostrando 1–10 de 50" — rendered at the left; if omitted, shows page number only. */
  rangeLabel?: string;
  className?: string;
};

export function DataTablePagination({
  page,
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  rangeLabel,
  className,
}: DataTablePaginationProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:justify-between",
        className,
      )}
    >
      <span className="text-muted-foreground text-sm">
        {rangeLabel ?? ""}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canPrev}
          onClick={onPrev}
          aria-label={prevLabel}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-muted-foreground min-w-[2.5rem] text-center text-sm tabular-nums">
          {page}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canNext}
          onClick={onNext}
          aria-label={nextLabel}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
