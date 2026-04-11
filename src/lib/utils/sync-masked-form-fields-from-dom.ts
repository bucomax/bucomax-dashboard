import type { FieldValues, Path, UseFormSetValue } from "react-hook-form";

/**
 * Campos mascarados (telefone, CPF, CEP) guardam no RHF só dígitos, mas o valor
 * pintado no DOM pode divergir (autofill, ref apontando fora do input nativo).
 * Chame no submit, antes de `handleSubmit`, para copiar DOM → estado.
 */
export function syncMaskedFormFieldsFromDom<T extends FieldValues>(
  formEl: HTMLFormElement,
  setValue: UseFormSetValue<T>,
  fieldNames: ReadonlyArray<{
    name: Path<T>;
    normalize: (raw: string) => string;
  }>,
): void {
  const opts = { shouldValidate: false as const, shouldDirty: true as const, shouldTouch: true as const };
  for (const { name, normalize } of fieldNames) {
    const el = formEl.querySelector<HTMLInputElement>(`input[name="${String(name)}"]`);
    if (!el) continue;
    setValue(name, normalize(el.value) as never, opts);
  }
}
