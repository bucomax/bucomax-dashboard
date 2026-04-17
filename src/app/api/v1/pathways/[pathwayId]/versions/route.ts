import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postPathwayVersionBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId } = await ctx.params;

  const pathway = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: tenantCtx.tenantId },
    select: { id: true },
  });
  if (!pathway) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPathwayVersionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const last = await prisma.pathwayVersion.findFirst({
      where: { pathwayId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (last?.version ?? 0) + 1;

    try {
      const row = await prisma.pathwayVersion.create({
        data: {
          pathwayId,
          version: nextVersion,
          graphJson: parsed.data.graphJson as object,
          published: false,
        },
        select: {
          id: true,
          pathwayId: true,
          version: true,
          published: true,
          createdAt: true,
        },
      });

      return jsonSuccess(
        {
          version: {
            ...row,
            createdAt: row.createdAt.toISOString(),
          },
        },
        { status: 201 },
      );
    } catch (err) {
      const isUniqueViolation =
        err instanceof Error &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      if (!isUniqueViolation || attempt === MAX_RETRIES - 1) {
        throw err;
      }
      // Unique constraint — outra requisição concorrente criou a mesma versão. Retry.
    }
  }

  return jsonError("CONFLICT", apiT("errors.pathwayVersionConflict"), 409);
}
