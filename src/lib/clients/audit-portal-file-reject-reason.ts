/**
 * Monta mapa fileAssetId → motivo da recusa a partir de eventos de auditoria,
 * considerando o mais recente por arquivo (`events` já ordenados por `createdAt` desc).
 */
export function latestRejectReasonByFileAssetId(
  events: readonly { payload: unknown }[],
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const { payload } of events) {
    if (!payload || typeof payload !== "object") continue;
    const p = payload as Record<string, unknown>;
    const fileAssetId = typeof p.fileAssetId === "string" ? p.fileAssetId : null;
    if (!fileAssetId || map.has(fileAssetId)) continue;
    const raw = p.rejectReason;
    const reason = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
    map.set(fileAssetId, reason);
  }
  return map;
}
