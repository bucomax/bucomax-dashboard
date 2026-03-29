"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Field, FieldLabel } from "@/shared/components/ui/field";

function parseDigitsToOptionalNonNegativeInt(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return undefined;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export type LabeledNonNegativeIntegerUnitFieldProps = {
  id: string;
  label: string;
  /** Unidade exibida junto ao campo (ex.: «dias» / «days»), fora do rótulo. */
  unitLabel: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

/**
 * Inteiro ≥ 0 opcional: apenas dígitos; unidade como sufixo dentro do controle (Field + Input estilo projeto).
 */
export function LabeledNonNegativeIntegerUnitField({
  id,
  label,
  unitLabel,
  value,
  onChange,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: LabeledNonNegativeIntegerUnitFieldProps) {
  const display = value === undefined ? "" : String(value);

  return (
    <Field className={className} data-invalid={ariaInvalid ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        className={cn(
          "flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-transparent transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          "dark:bg-input/30",
          disabled && "pointer-events-none cursor-not-allowed bg-input/50 opacity-50 dark:bg-input/80",
          ariaInvalid && "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          placeholder="—"
          value={display}
          onChange={(e) => {
            onChange(parseDigitsToOptionalNonNegativeInt(e.target.value));
          }}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-2.5 py-1 text-base outline-none md:text-sm",
            "text-foreground placeholder:text-muted-foreground",
          )}
        />
        <span
          className="text-muted-foreground flex shrink-0 items-center self-stretch rounded-r-lg border-l border-input bg-muted px-2.5 text-sm select-none"
          aria-hidden
        >
          {unitLabel}
        </span>
      </div>
    </Field>
  );
}
