"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

type InfoTooltipProps = {
  /** `aria-label` do ícone (ex.: “Mostrar explicação…”). */
  ariaLabel: string;
  /** Conteúdo exibido ao passar o mouse ou focar no (i). */
  children: ReactNode;
  /** Classes extras no botão (ex.: alinhar com `FieldLabel`). */
  triggerClassName?: string;
};

/**
 * Ícone de informação com texto no hover/foco — alinhado a Configurações → Etapas
 * (`pathway-stage-default-assignees-field` e afins): não é acordeão por clique.
 */
export function InfoTooltip({ ariaLabel, children, triggerClassName }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "text-muted-foreground hover:bg-muted/60 hover:text-foreground shrink-0 rounded-md p-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              "mt-0.5",
              triggerClassName,
            )}
            aria-label={ariaLabel}
          >
            <Info className="size-4" aria-hidden />
          </button>
        }
      />
      <TooltipContent side="bottom" align="start" className="max-w-sm text-left text-sm leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
