import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { runPathwayPublishPreflight } from "@/lib/pathway/pathway-publish-preflight";
import { postPathwayPublishPreviewBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string; versionId: string }> };

/**
 * Pré-visualização da publicação (mesmas regras do POST `…/publish`, sem efeitos).
 * Corpo opcional `{ "graphJson" }` para validar alterações ainda não salvas no rascunho.
 */
export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId, versionId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = postPathwayPublishPreviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: tenantCtx.tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }

  const version = await prisma.pathwayVersion.findFirst({
    where: { id: versionId, pathwayId },
  });
  if (!version) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayVersionNotFound"), 404);
  }

  const graphJson = parsed.data.graphJson !== undefined ? parsed.data.graphJson : version.graphJson;

  const preflight = await runPathwayPublishPreflight(prisma, {
    tenantId: tenantCtx.tenantId,
    pathwayId,
    versionId,
    graphJson,
    apiT: apiT as (key: string, params?: Record<string, string>) => string,
  });

  return jsonSuccess({ preview: preflight });
}
