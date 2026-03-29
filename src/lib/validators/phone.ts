import { z } from "zod";

import { zodApiMsg } from "@/lib/api/zod-i18n";

/** Apenas dígitos, 10–11 (BR com DDD). Mensagens via `@api/...` para tradução na API/RHF. */
export const phoneDigitsSchema = z
  .string()
  .min(1, { message: zodApiMsg("errors.validationPhoneRequired") })
  .refine((v) => {
    const d = v.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 11;
  }, zodApiMsg("errors.validationPhoneBrDigits"));

export function formatPhoneBrDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}
