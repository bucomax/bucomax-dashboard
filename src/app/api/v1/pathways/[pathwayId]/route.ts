import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { patchPathwayBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pathwayId: string }> };

async function getPathwayOr404(pathwayId: string, tenantId: string) {
  return prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          published: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId } = await ctx.params;
  const row = await getPathwayOr404(pathwayId, tenantCtx.tenantId);
  if (!row) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }

  return jsonSuccess({
    pathway: {
      id: row.id,
      name: row.name,
      description: row.description,
      versions: row.versions.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId } = await ctx.params;
  const existing = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: tenantCtx.tenantId },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = patchPathwayBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const data: { name?: string; description?: string | null } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.description !== undefined) {
    data.description =
      parsed.data.description === null ? null : parsed.data.description.trim() || null;
  }
  if (Object.keys(data).length === 0) {
    return jsonError("VALIDATION_ERROR", apiT("errors.noFieldsToUpdate"), 422);
  }

  const row = await prisma.carePathway.update({
    where: { id: pathwayId },
    data,
  });

  return jsonSuccess({
    pathway: {
      id: row.id,
      name: row.name,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const { pathwayId } = await ctx.params;
  const existing = await prisma.carePathway.findFirst({
    where: { id: pathwayId, tenantId: tenantCtx.tenantId },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", apiT("errors.pathwayNotFound"), 404);
  }

  const inUse = await prisma.patientPathway.count({ where: { pathwayId } });
  if (inUse > 0) {
    return jsonError("CONFLICT", apiT("errors.pathwayPatientsBlockDelete"), 409);
  }

  await prisma.carePathway.delete({ where: { id: pathwayId } });

  return jsonSuccess({ message: apiT("success.pathwayDeleted") });
}
