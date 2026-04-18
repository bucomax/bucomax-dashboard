"use client";

import { todayIsoDateLocal } from "@/lib/utils/date";
import { useFormContext } from "react-hook-form";
import type { ChangeEvent } from "react";

import { FormInput, type FormInputProps } from "./form-input";

export type FormBirthDateInputProps = Omit<FormInputProps, "type" | "onChange">;

/** Campo de data de nascimento: não permite selecionar data futura (`max` = hoje). Clamp no onChange. */
export function FormBirthDateInput({ name, ...props }: FormBirthDateInputProps) {
  const { setValue } = useFormContext();

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    const max = todayIsoDateLocal();
    setValue(name, v && v > max ? max : v, { shouldValidate: true, shouldDirty: true });
  }

  return <FormInput {...props} name={name} type="date" max={todayIsoDateLocal()} onChange={handleChange} />;
}
