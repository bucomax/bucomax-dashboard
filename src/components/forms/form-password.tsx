"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils/cn";
import {
  formDescriptionClassName,
  formErrorClassName,
  formFieldClassName,
  formLabelClassName,
} from "./form-field-styles";

export type FormPasswordProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "type"
> & {
  name: string;
  label: string;
  description?: string;
  containerClassName?: string;
};

/**
 * Senha com botão mostrar/ocultar (ícone olho).
 */
export function FormPassword({
  name,
  label,
  description,
  className,
  containerClassName,
  id,
  autoComplete = "current-password",
  ...inputProps
}: FormPasswordProps) {
  const { control } = useFormContext();
  const inputId = id ?? name;
  const [visible, setVisible] = React.useState(false);

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
          <div className="relative">
            <input
              id={inputId}
              {...field}
              {...inputProps}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              value={field.value ?? ""}
              className={cn(formFieldClassName, "pr-10", className)}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-md text-zinc-500 transition hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            >
              {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
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
