"use client";

import type { ClientTimelineEventCategory } from "@/types/api/clients-v1";
import { cn } from "@/lib/utils";
import {
  Building2,
  FileText,
  Scale,
  Shield,
  Stethoscope,
} from "lucide-react";

export type AuditTimelineRowModel = {
  id: string;
  category: ClientTimelineEventCategory;
  title: string;
  subtitle: string;
};

function categoryBorderClass(cat: ClientTimelineEventCategory): string {
  switch (cat) {
    case "security":
      return "border-l-violet-500";
    case "clinical":
      return "border-l-emerald-600";
    case "documents":
      return "border-l-sky-600";
    case "administrative":
      return "border-l-slate-500";
    case "compliance":
      return "border-l-amber-600";
    default:
      return "border-l-muted-foreground";
  }
}

/** Cor do ícone nos filtros quando o chip está ativo (alinhado à barra lateral da lista). */
export function timelineCategoryIconClassForActiveFilter(
  category: ClientTimelineEventCategory,
): string {
  switch (category) {
    case "security":
      return "text-violet-600 dark:text-violet-300";
    case "clinical":
      return "text-emerald-600 dark:text-emerald-400";
    case "documents":
      return "text-sky-600 dark:text-sky-300";
    case "administrative":
      return "text-slate-600 dark:text-slate-300";
    case "compliance":
      return "text-amber-700 dark:text-amber-300";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Estilo de chip para filtros da linha do tempo (ficha do cliente).
 * `disabled`: única categoria ainda selecionada — não pode desmarcar tudo.
 */
export function timelineCategoryFilterChipCn(
  category: ClientTimelineEventCategory,
  active: boolean,
  disabled: boolean,
): string {
  const base =
    "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-[background-color,border-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (disabled) {
    return cn(base, "cursor-not-allowed opacity-70");
  }

  if (!active) {
    return cn(
      base,
      "border-border/80 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/45 active:bg-muted/60",
    );
  }

  switch (category) {
    case "security":
      return cn(
        base,
        "border-violet-400/80 bg-violet-500/[0.12] text-violet-950 shadow-sm hover:bg-violet-500/[0.18] dark:border-violet-500/45 dark:bg-violet-500/15 dark:text-violet-50 dark:hover:bg-violet-500/22",
      );
    case "clinical":
      return cn(
        base,
        "border-emerald-500/70 bg-emerald-500/[0.11] text-emerald-950 shadow-sm hover:bg-emerald-500/[0.16] dark:border-emerald-500/45 dark:bg-emerald-500/14 dark:text-emerald-50 dark:hover:bg-emerald-500/20",
      );
    case "documents":
      return cn(
        base,
        "border-sky-500/75 bg-sky-500/[0.11] text-sky-950 shadow-sm hover:bg-sky-500/[0.17] dark:border-sky-500/45 dark:bg-sky-500/14 dark:text-sky-50 dark:hover:bg-sky-500/20",
      );
    case "administrative":
      return cn(
        base,
        "border-slate-400/90 bg-slate-500/[0.10] text-slate-900 shadow-sm hover:bg-slate-500/[0.15] dark:border-slate-500/50 dark:bg-slate-500/15 dark:text-slate-50 dark:hover:bg-slate-500/20",
      );
    case "compliance":
      return cn(
        base,
        "border-amber-500/80 bg-amber-500/[0.12] text-amber-950 shadow-sm hover:bg-amber-500/[0.18] dark:border-amber-500/45 dark:bg-amber-500/14 dark:text-amber-50 dark:hover:bg-amber-500/20",
      );
    default:
      return cn(base, "border-border bg-muted text-foreground");
  }
}

/** Ícone por categoria — reutilizado nos filtros da ficha do cliente. */
export function TimelineCategoryIcon({
  category,
  className,
}: {
  category: ClientTimelineEventCategory;
  /** Sobrescreve a cor padrão (ex.: chip ativo nos filtros). */
  className?: string;
}) {
  const cls = cn("size-4 shrink-0", className ?? "text-muted-foreground");
  switch (category) {
    case "security":
      return <Shield className={cls} aria-hidden />;
    case "clinical":
      return <Stethoscope className={cls} aria-hidden />;
    case "documents":
      return <FileText className={cls} aria-hidden />;
    case "administrative":
      return <Building2 className={cls} aria-hidden />;
    case "compliance":
      return <Scale className={cls} aria-hidden />;
    default:
      return null;
  }
}

/**
 * Lista de eventos de auditoria / jornada — mesmo layout no dashboard (`/clients/:id`) e no portal do paciente.
 */
export function AuditTimelineList({ rows }: { rows: AuditTimelineRowModel[] }) {
  return (
    <ul className="divide-border divide-y text-sm">
      {rows.map((row) => (
        <li
          key={row.id}
          className={cn(
            "flex flex-col gap-1 border-l-4 py-3 pl-3",
            categoryBorderClass(row.category),
          )}
        >
          <span className="flex items-start gap-2 font-medium">
            <TimelineCategoryIcon category={row.category} />
            <span className="min-w-0">{row.title}</span>
          </span>
          <span className="text-muted-foreground pl-6 text-xs">{row.subtitle}</span>
        </li>
      ))}
    </ul>
  );
}
