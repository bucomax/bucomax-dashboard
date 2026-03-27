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

export type FormInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "name"> & {
  name: string;
  label: string;
  description?: string;
  containerClassName?: string;
};

/**
 * Campo de texto com label, erro do Zod/RHF e descrição opcional.
 * Deve estar dentro de `<Form {...useForm()}>`.
 */
export function FormInput({
  name,
  label,
  description,
  className,
  containerClassName,
  id,
  ...inputProps
}: FormInputProps) {
  const { control } = useFormContext();
  const inputId = id ?? name;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-1.5", containerClassName)}>
          <label htmlFor={inputId} className={formLabelClassName}>
            {label}
          </label>
          {description ? <p className={formDescriptionClassName}>{description}</p> : null}
          <input
            id={inputId}
            {...field}
            {...inputProps}
            value={field.value ?? ""}
            className={cn(formFieldClassName, className)}
          />
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
