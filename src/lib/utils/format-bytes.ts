const UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < UNITS.length - 1) {
    n /= 1024;
    u += 1;
  }
  const digits = u === 0 ? 0 : n < 10 ? 1 : n < 100 ? 1 : 0;
  return `${n.toFixed(digits)} ${UNITS[u]}`;
}
