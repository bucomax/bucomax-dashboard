/** Formata CPF para exibição: 000.000.000-00 */
export function formatCpfDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Mantém apenas dígitos de CPF (máx. 11). */
export function digitsOnlyCpf(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}
