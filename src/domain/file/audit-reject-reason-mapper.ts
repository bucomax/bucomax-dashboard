export function latestRejectReasonByFileAssetId(
  events: readonly { payload: unknown }[],
): Map<string, string | null> {
  const map = new Map<string, string | null>();

  for (const { payload } of events) {
    if (!payload || typeof payload !== "object") continue;

    const data = payload as Record<string, unknown>;
    const fileAssetId = typeof data.fileAssetId === "string" ? data.fileAssetId : null;
    if (!fileAssetId || map.has(fileAssetId)) continue;

    const rawReason = data.rejectReason;
    const reason = typeof rawReason === "string" && rawReason.trim() !== "" ? rawReason.trim() : null;
    map.set(fileAssetId, reason);
  }

  return map;
}
