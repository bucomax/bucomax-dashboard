"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils/cn";
import {
  formDescriptionClassName,
  formErrorClassName,
  formFieldClassName,
  formLabelClassName,
} from "./form-field-styles";

export type FormSelectOption = { value: string; label: string; disabled?: boolean };

export type FormSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name"> & {
  name: string;
  label: string;
  description?: string;
  options: FormSelectOption[];
  placeholder?: string;
  containerClassName?: string;
};

/**
 * `<select>` nativo com validação RHF + Zod.
 */
export function FormSelect({
  name,
  label,
  description,
  options,
  placeholder,
  className,
  containerClassName,
  id,
  ...selectProps
}: FormSelectProps) {
  const { control } = useFormContext();
  const selectId = id ?? name;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-1.5", containerClassName)}>
          <label htmlFor={selectId} className={formLabelClassName}>
            {label}
          </label>
          {description ? <p className={formDescriptionClassName}>{description}</p> : null}
          <select
            id={selectId}
            {...field}
            {...selectProps}
            value={field.value ?? ""}
            className={cn(formFieldClassName, className)}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          {fieldState.error?.message ? (
            <p role="alert" className={formErrorClassName}>
              {String(fieldState.error.message)}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}
