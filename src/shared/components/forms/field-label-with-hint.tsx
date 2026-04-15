"use client";

import { useTranslations } from "next-intl";

import { FieldLabel } from "@/shared/components/ui/field";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";
import { cn } from "@/lib/utils";

type FieldLabelWithHintProps = {
  htmlFor: string;
  label: string;
  /** Texto da dica no (i): toque ou hover (popover, não tooltip). */
  description?: string;
  className?: string;
};

/**
 * Label do campo com ícone (i) opcional à direita — dica em popover (toque no mobile, hover no desktop).
 */
export function FieldLabelWithHint({ htmlFor, label, description, className }: FieldLabelWithHintProps) {
  const t = useTranslations("global");

  if (!description?.trim()) {
    return (
      <FieldLabel htmlFor={htmlFor} className={className}>
        {label}
      </FieldLabel>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <FieldLabel htmlFor={htmlFor} className="mb-0">
        {label}
      </FieldLabel>
      <InfoTooltip ariaLabel={t("forms.fieldHintAria")} triggerClassName="mt-0 p-1">
        {description}
      </InfoTooltip>
    </div>
  );
}
