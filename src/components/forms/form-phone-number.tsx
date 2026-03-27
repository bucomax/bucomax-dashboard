"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { digitsOnlyPhone, formatPhoneBrDisplay } from "@/lib/validators/phone";
import { cn } from "@/lib/utils/cn";
import {
  formDescriptionClassName,
  formErrorClassName,
  formFieldClassName,
  formLabelClassName,
} from "./form-field-styles";

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
          <div className={cn("space-y-1.5", containerClassName)}>
            <label htmlFor={inputId} className={formLabelClassName}>
              {label}
            </label>
            {description ? <p className={formDescriptionClassName}>{description}</p> : null}
            <input
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
              className={cn(formFieldClassName, className)}
            />
            {fieldState.error?.message ? (
              <p role="alert" className={formErrorClassName}>
                {String(fieldState.error.message)}
              </p>
            ) : null}
          </div>
        );
      }}
    />
  );
}
