import { prisma } from "@/infrastructure/database/prisma";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { postClientNoteBodySchema } from "@/lib/validators/client-note";
import { clientDetailQuerySchema } from "@/lib/validators/client-detail-query";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ clientId: string }> };

async function ensureClientInTenant(clientId: string, tenantId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, tenantId, deletedAt: null },
    select: { id: true },
  });
}

export async function GET(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const parsedQuery = clientDetailQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return jsonError("VALIDATION_ERROR", parsedQuery.error.flatten().formErrors.join("; "), 422);
  }

  const { page, limit } = parsedQuery.data;
  const offset = (page - 1) * limit;
  const { clientId } = await ctx.params;

  const client = await ensureClientInTenant(clientId, tenantCtx.tenantId);
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  const where = { tenantId: tenantCtx.tenantId, clientId };
  const [totalItems, rows] = await Promise.all([
    prisma.patientNote.count({ where }),
    prisma.patientNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return jsonSuccess({
    data: rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: row.author,
    })),
    pagination: buildPagination(page, limit, totalItems),
  });
}

export async function POST(request: Request, ctx: RouteCtx) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const { clientId } = await ctx.params;
  const client = await ensureClientInTenant(clientId, tenantCtx.tenantId);
  if (!client) {
    return jsonError("NOT_FOUND", apiT("errors.patientNotFound"), 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postClientNoteBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const note = await prisma.patientNote.create({
    data: {
      tenantId: tenantCtx.tenantId,
      clientId,
      authorUserId: auth.session!.user.id,
      content: parsed.data.content,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return jsonSuccess(
    {
      note: {
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        author: note.author,
      },
    },
    { status: 201 },
  );
}
