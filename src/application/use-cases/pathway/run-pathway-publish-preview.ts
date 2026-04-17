import { runPathwayPublishPreflight } from "@/infrastructure/pathway/publish-pathway-preflight";
import { pathwayPrismaRepository } from "@/infrastructure/repositories/pathway.repository";
import type { ApiT } from "@/lib/api/i18n";

export type RunPathwayPublishPreviewResult =
  | { ok: true; preview: Awaited<ReturnType<typeof runPathwayPublishPreflight>> }
  | { ok: false; code: "PATHWAY_NOT_FOUND" | "VERSION_NOT_FOUND" };

export async function runPathwayPublishPreview(params: {
  tenantId: string;
  pathwayId: string;
  versionId: string;
  graphJsonOverride: unknown | undefined;
  apiT: ApiT;
}): Promise<RunPathwayPublishPreviewResult> {
  const { tenantId, pathwayId, versionId, graphJsonOverride, apiT } = params;

  const pathway = await pathwayPrismaRepository.findCarePathwayIdForPublish(tenantId, pathwayId);
  if (!pathway) {
    return { ok: false, code: "PATHWAY_NOT_FOUND" };
  }

  const version = await pathwayPrismaRepository.findPathwayVersionForPublish(pathwayId, versionId);
  if (!version) {
    return { ok: false, code: "VERSION_NOT_FOUND" };
  }

  const versionRow = version as { graphJson: unknown };
  const graphJson = graphJsonOverride !== undefined ? graphJsonOverride : versionRow.graphJson;

  const preview = await runPathwayPublishPreflight({
    tenantId,
    pathwayId,
    versionId,
    graphJson,
    apiT: apiT as (key: string, params?: Record<string, string>) => string,
  });

  return { ok: true, preview };
}
