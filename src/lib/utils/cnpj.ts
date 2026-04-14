/** Exibe CNPJ com máscara quando há 14 dígitos; caso contrário retorna o texto trimado. */
export function formatBrCnpjDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 14) return raw.trim();
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}
