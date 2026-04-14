/** Nome para exibição sem a última extensão (ex.: `31706.jpg` → `31706`). */
export function displayFileBaseName(fileName: string): string {
  const s = fileName.trim();
  const dot = s.lastIndexOf(".");
  if (dot <= 0 || dot === s.length - 1) return s;
  return s.slice(0, dot);
}
