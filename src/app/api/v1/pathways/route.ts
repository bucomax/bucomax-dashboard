import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postPathwayBodySchema } from "@/lib/validators/pathway";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;

  const rows = await prisma.carePathway.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      versions: {
        where: { published: true },
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true },
      },
    },
  });

  return jsonSuccess({
    pathways: rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      publishedVersion: p.versions[0] ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postPathwayBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const row = await prisma.carePathway.create({
    data: {
      tenantId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });

  return jsonSuccess(
    {
      pathway: {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
