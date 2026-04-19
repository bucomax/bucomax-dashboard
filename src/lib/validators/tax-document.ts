import { formatCpfDisplay } from "@/lib/validators/cpf";

/** Apenas dígitos; CPF 11 ou CNPJ 14. */
export function digitsOnlyTaxDocument(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

function formatCnpjProgressive(d: string): string {
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** CPF (≤11 dígitos) ou CNPJ (12–14); valor = só dígitos. */
export function formatTaxDocumentDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 14);
  if (d.length === 0) return "";
  if (d.length <= 11) return formatCpfDisplay(d);
  return formatCnpjProgressive(d);
}
