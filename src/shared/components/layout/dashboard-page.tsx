import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardPageProps = {
  title: string;
  description?: ReactNode;
  /** Botões ou links à direita do título (ex.: “Novo paciente”). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Área de conteúdo padrão das telas autenticadas: título, descrição opcional e ações.
 */
export function DashboardPage({ title, description, actions, children, className }: DashboardPageProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <div className="text-muted-foreground text-sm">{description}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
