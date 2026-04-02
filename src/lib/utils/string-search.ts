/**
 * Texto normalizado para busca case-insensitive e sem acentos (útil em PT-BR).
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
