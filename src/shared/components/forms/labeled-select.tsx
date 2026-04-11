"use client";

import * as React from "react";

import { FieldLabelWithHint } from "@/shared/components/forms/field-label-with-hint";
import { Field } from "@/shared/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/lib/utils";

export type LabeledSelectOption = { value: string; label: string; disabled?: boolean };

export type LabeledSelectProps = {
  id?: string;
  label: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: LabeledSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

/**
 * Select com label (sem React Hook Form). Para formulários validados, use {@link FormSelect}.
 */
export function LabeledSelect({
  id,
  label,
  description,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  triggerClassName,
}: LabeledSelectProps) {
  const autoId = React.useId();
  const controlId = id ?? autoId;
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Field className={className}>
      <FieldLabelWithHint htmlFor={controlId} label={label} description={description} />
      <Select
        value={value}
        onValueChange={(v) => onValueChange(v ?? "")}
        disabled={disabled}
      >
        <SelectTrigger id={controlId} className={cn("w-full", triggerClassName)}>
          <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
