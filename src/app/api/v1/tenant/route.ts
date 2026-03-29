import { prisma } from "@/infrastructure/database/prisma";
import { getApiT } from "@/lib/api/i18n";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  assertTenantAdminOrSuper,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { patchTenantClinicBodySchema } from "@/lib/validators/tenant-clinic";

export const dynamic = "force-dynamic";

function toTenantClinicDto(tenant: {
  id: string;
  name: string;
  slug: string;
  taxId: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  affiliatedHospitals: string | null;
}) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    taxId: tenant.taxId,
    phone: tenant.phone,
    addressLine: tenant.addressLine,
    city: tenant.city,
    postalCode: tenant.postalCode,
    affiliatedHospitals: tenant.affiliatedHospitals,
  };
}

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const forbidden = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId, request, apiT);
  if (forbidden) return forbidden;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantCtx.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      taxId: true,
      phone: true,
      addressLine: true,
      city: true,
      postalCode: true,
      affiliatedHospitals: true,
    },
  });

  if (!tenant) {
    return jsonError("NOT_FOUND", apiT("errors.tenantNotFound"), 404);
  }

  return jsonSuccess({
    tenant: toTenantClinicDto(tenant),
  });
}

export async function PATCH(request: Request) {
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

  const parsed = patchTenantClinicBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", parsed.error.flatten().formErrors.join("; "), 422);
  }

  const data = parsed.data;
  const tenant = await prisma.tenant.update({
    where: { id: tenantCtx.tenantId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.taxId !== undefined ? { taxId: data.taxId } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.addressLine !== undefined ? { addressLine: data.addressLine } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
      ...(data.affiliatedHospitals !== undefined
        ? { affiliatedHospitals: data.affiliatedHospitals }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      taxId: true,
      phone: true,
      addressLine: true,
      city: true,
      postalCode: true,
      affiliatedHospitals: true,
    },
  });

  return jsonSuccess({
    tenant: toTenantClinicDto(tenant),
  });
}
