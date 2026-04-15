import { prisma } from "@/infrastructure/database/prisma";
import { getClientsListPageWithoutCache } from "@/infrastructure/cache/cached-clients-list";
import { revalidateTenantClientsList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { joinTranslatedZodIssues } from "@/lib/api/zod-i18n";
import { jsonIfPrismaSchemaMismatch } from "@/lib/api/prisma-schema-error";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import {
  loadTenantMembershipClientScope,
  mergeClientWhereWithVisibility,
} from "@/lib/auth/client-visibility";
import { validateClientOptionalRefs } from "@/lib/clients/validate-client-optional-refs";
import {
  CLIENT_LIST_INCLUDE,
  buildClientsListBaseWhere,
  mapPrismaClientRowToClientDto,
  serializeClientListItem,
} from "@/lib/clients/clients-list-shared";
import { AuditEventType, recordAuditEvent } from "@/infrastructure/audit/record-audit-event";
import { postClientBodySchema } from "@/lib/validators/client";
import { clientsListQuerySchema } from "@/lib/validators/clients-list-query";
export const dynamic = "force-dynamic";

/** Tamanho do lote quando o status SLA exige cálculo em memória (sem cache). */
const STATUS_FILTER_SCAN_BATCH = 400;

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  try {
    const clientScope = await loadTenantMembershipClientScope(
      auth.session!.user.id,
      tenantId,
      auth.session!.user.globalRole,
    );

    const url = new URL(request.url);
    const parsed = clientsListQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      pathwayId: url.searchParams.get("pathwayId") ?? undefined,
      stageId: url.searchParams.get("stageId") ?? undefined,
      status: url.searchParams.get("status") || undefined,
      fresh: url.searchParams.get("fresh") ?? undefined,
    });
    if (!parsed.success) {
      return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
    }

    const { limit, page, q, pathwayId, stageId, status: statusFilter } = parsed.data;
    const offset = (page - 1) * limit;
    const now = new Date();

    const baseWhere = buildClientsListBaseWhere({ tenantId, q, pathwayId, stageId });
    const where = mergeClientWhereWithVisibility(baseWhere, clientScope, auth.session!.user.id);

    if (statusFilter) {
      const pageRows: ReturnType<typeof serializeClientListItem>[] = [];
      let matchedCount = 0;
      let skip = 0;

      while (true) {
        const batch = await prisma.client.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: STATUS_FILTER_SCAN_BATCH,
          skip,
          include: CLIENT_LIST_INCLUDE,
        });
        if (batch.length === 0) break;

        for (const client of batch) {
          const row = serializeClientListItem(client, now);
          const matchesStatus =
            statusFilter === "completed"
              ? row.journeyCompletedAt != null
              : row.slaStatus === statusFilter;
          if (!matchesStatus) continue;
          if (matchedCount >= offset && pageRows.length < limit) {
            pageRows.push(row);
          }
          matchedCount += 1;
        }

        if (batch.length < STATUS_FILTER_SCAN_BATCH) break;
        skip += batch.length;
      }

      return jsonSuccess({
        data: pageRows,
        pagination: buildPagination(page, limit, matchedCount),
        statusFilterCapped: false,
      });
    }

    const listArgs = {
      tenantId,
      viewerUserId: auth.session!.user.id,
      globalRole: auth.session!.user.globalRole,
      scope: clientScope,
      limit,
      page,
      q,
      pathwayId,
      stageId,
    };

    // Sem `unstable_cache` aqui: em Vercel/serverless o cache incremental pode falhar ou serializar
    // mal o payload Prisma → 500 na listagem. A consulta já é leve com índices em `tenantId`.
    const { items, total } = await getClientsListPageWithoutCache(listArgs);

    return jsonSuccess({
      data: items.map((c) => serializeClientListItem(c, now)),
      pagination: buildPagination(page, limit, total),
      statusFilterCapped: false,
    });
  } catch (err) {
    console.error("[GET /api/v1/clients]", err);
    const schemaErr = jsonIfPrismaSchemaMismatch(err, apiT, "[GET /api/v1/clients]");
    if (schemaErr) return schemaErr;
    if (err instanceof Error) console.error("[GET /api/v1/clients]", err.message);
    return jsonError("INTERNAL_ERROR", apiT("errors.internalError"), 500);
  }
}

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const ctx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (ctx.response) return ctx.response;
  const { tenantId } = ctx;
  const forbidden = await assertActiveTenantMembership(auth.session!, tenantId, request, apiT);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postClientBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      joinTranslatedZodIssues(parsed.error, apiT as (key: string) => string),
      422,
    );
  }

  const refErr = await validateClientOptionalRefs(
    tenantId,
    {
      assignedToUserId: parsed.data.assignedToUserId,
      opmeSupplierId: parsed.data.opmeSupplierId,
    },
    apiT,
  );
  if (refErr) return refErr;

  const d = parsed.data;
  const row = await prisma.client.create({
    data: {
      tenantId,
      name: d.name,
      phone: d.phone,
      email: d.email,
      caseDescription: d.caseDescription,
      documentId: d.documentId,
      postalCode: d.postalCode,
      addressLine: d.addressLine,
      addressNumber: d.addressNumber,
      addressComp: d.addressComp,
      neighborhood: d.neighborhood,
      city: d.city,
      state: d.state,
      isMinor: d.isMinor,
      guardianName: d.guardianName,
      guardianDocumentId: d.guardianDocumentId,
      guardianPhone: d.guardianPhone,
      assignedToUserId: d.assignedToUserId,
      opmeSupplierId: d.opmeSupplierId,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      caseDescription: true,
      documentId: true,
      postalCode: true,
      addressLine: true,
      addressNumber: true,
      addressComp: true,
      neighborhood: true,
      city: true,
      state: true,
      isMinor: true,
      guardianName: true,
      guardianDocumentId: true,
      guardianPhone: true,
      assignedToUserId: true,
      opmeSupplierId: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      opmeSupplier: { select: { id: true, name: true } },
      patientPathways: { where: { completedAt: null }, take: 1, orderBy: { createdAt: "desc" }, select: { id: true } },
    },
  });

  revalidateTenantClientsList(tenantId);

  await recordAuditEvent(prisma, {
    tenantId,
    clientId: row.id,
    patientPathwayId: null,
    actorUserId: auth.session!.user.id,
    type: AuditEventType.PATIENT_CREATED,
    payload: { clientId: row.id },
  });

  return jsonSuccess(
    {
      client: mapPrismaClientRowToClientDto(row),
    },
    { status: 201 },
  );
}
