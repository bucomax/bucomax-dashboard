import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { postClientBodySchema } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const ctx = getActiveTenantIdOr400(auth.session!);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);
  const q = searchParams.get("q")?.trim();

  const where = {
    tenantId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        phone: true,
        caseDescription: true,
        documentId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.client.count({ where }),
  ]);

  return jsonSuccess({
    clients: items.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
}

export async function POST(request: Request) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const ctx = getActiveTenantIdOr400(auth.session!);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = postClientBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const row = await prisma.client.create({
    data: {
      tenantId,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone.trim(),
      caseDescription: parsed.data.caseDescription?.trim() || null,
      documentId: parsed.data.documentId?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      caseDescription: true,
      documentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonSuccess(
    {
      client: {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
