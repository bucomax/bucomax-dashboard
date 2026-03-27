import { prisma } from "@/infrastructure/database/prisma";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { patchClientBodySchema } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ clientId: string }> };

async function getClientInTenant(clientId: string, tenantId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, tenantId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      name: true,
      phone: true,
      caseDescription: true,
      documentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function GET(_request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { clientId } = await ctx.params;
  const row = await getClientInTenant(clientId, t.tenantId);
  if (!row) {
    return jsonError("NOT_FOUND", "Paciente não encontrado.", 404);
  }

  return jsonSuccess({
    client: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { clientId } = await ctx.params;
  const existing = await getClientInTenant(clientId, t.tenantId);
  if (!existing) {
    return jsonError("NOT_FOUND", "Paciente não encontrado.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Corpo JSON inválido.", 400);
  }

  const parsed = patchClientBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const data: {
    name?: string;
    phone?: string;
    caseDescription?: string | null;
    documentId?: string | null;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone.trim();
  if (parsed.data.caseDescription !== undefined) {
    data.caseDescription =
      parsed.data.caseDescription === null ? null : parsed.data.caseDescription.trim() || null;
  }
  if (parsed.data.documentId !== undefined) {
    data.documentId =
      parsed.data.documentId === null ? null : parsed.data.documentId.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return jsonError("VALIDATION_ERROR", "Nenhum campo para atualizar.", 422);
  }

  const row = await prisma.client.update({
    where: { id: clientId },
    data,
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

  return jsonSuccess({
    client: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const auth = await requireSessionOr401();
  if (auth.response) return auth.response;

  const t = getActiveTenantIdOr400(auth.session!);
  if (t.response) return t.response;

  const { clientId } = await ctx.params;
  const existing = await getClientInTenant(clientId, t.tenantId);
  if (!existing) {
    return jsonError("NOT_FOUND", "Paciente não encontrado.", 404);
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { deletedAt: new Date() },
  });

  return jsonSuccess({ message: "Paciente removido." });
}
