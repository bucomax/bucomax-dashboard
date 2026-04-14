/** Formata hex SHA-256 longo para exibição compacta (cópia usa o valor completo). */
export function formatSha256Short(hex: string): string {
  const t = hex.trim().toLowerCase();
  if (t.length <= 24) return t;
  return `${t.slice(0, 12)}…${t.slice(-12)}`;
}
