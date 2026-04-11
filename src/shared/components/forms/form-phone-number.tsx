"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FieldLabelWithHint } from "@/shared/components/forms/field-label-with-hint";
import { Field, FieldError } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { digitsOnlyPhone, formatPhoneBrDisplay } from "@/lib/validators/phone";

export type FormPhoneNumberProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "type" | "onChange" | "value"
> & {
  name: string;
  label: string;
  description?: string;
  containerClassName?: string;
};

/**
 * Telefone BR: valor no formulário = apenas dígitos (compatível com `phoneDigitsSchema`).
 * Exibição formatada (XX) XXXXX-XXXX.
 */
export function FormPhoneNumber({
  name,
  label,
  description,
  className,
  containerClassName,
  id,
  inputMode = "tel",
  autoComplete = "tel",
  ...inputProps
}: FormPhoneNumberProps) {
  const { control } = useFormContext();
  const inputId = id ?? name;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const digits = typeof field.value === "string" ? field.value : "";
        const display = formatPhoneBrDisplay(digits);

        return (
          <Field data-invalid={!!fieldState.error} className={containerClassName}>
            <FieldLabelWithHint htmlFor={inputId} label={label} description={description} />
            <Input
              id={inputId}
              {...inputProps}
              type="text"
              inputMode={inputMode}
              autoComplete={autoComplete}
              value={display}
              onChange={(e) => {
                field.onChange(digitsOnlyPhone(e.target.value));
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              aria-invalid={!!fieldState.error}
              className={className}
            />
            <FieldError>{fieldState.error?.message ? String(fieldState.error.message) : null}</FieldError>
          </Field>
        );
      }}
    />
  );
}
