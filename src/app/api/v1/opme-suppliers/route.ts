import { getCachedOpmeSuppliersPage } from "@/infrastructure/cache/cached-opme-suppliers-list";
import { revalidateTenantOpmeSuppliersList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { prisma } from "@/infrastructure/database/prisma";
import { buildPagination } from "@/lib/api/pagination";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  assertTenantAdminOrSuper,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import {
  opmeSuppliersListQuerySchema,
  postOpmeSupplierBodySchema,
} from "@/lib/validators/opme-supplier";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const parsed = opmeSuppliersListQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    includeInactive: url.searchParams.get("includeInactive") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const { limit, page, q, includeInactive } = parsed.data;

  const { data, totalItems } = await getCachedOpmeSuppliersPage({
    tenantId: tenantCtx.tenantId,
    limit,
    page,
    q,
    includeInactive,
  });

  return jsonSuccess({
    data,
    pagination: buildPagination(page, limit, totalItems),
  });
}

export async function POST(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const adminBlock = await assertTenantAdminOrSuper(auth.session!, tenantCtx.tenantId, request, apiT);
  if (adminBlock) return adminBlock;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", apiT("errors.invalidJson"), 400);
  }

  const parsed = postOpmeSupplierBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const existing = await prisma.opmeSupplier.findFirst({
    where: {
      tenantId: tenantCtx.tenantId,
      name: { equals: parsed.data.name.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) {
    return jsonError("CONFLICT", apiT("errors.opmeSupplierNameConflict"), 409);
  }

  const supplier = await prisma.opmeSupplier.create({
    data: {
      tenantId: tenantCtx.tenantId,
      name: parsed.data.name.trim(),
    },
    select: { id: true, name: true, active: true },
  });

  revalidateTenantOpmeSuppliersList(tenantCtx.tenantId);

  return jsonSuccess(
    {
      supplier: {
        ...supplier,
        activePatientsCount: 0,
      },
    },
    { status: 201 },
  );
}
