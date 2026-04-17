import type { Prisma } from "@prisma/client";
import { revalidateTenantClientsList } from "@/infrastructure/cache/revalidate-tenant-lists";
import { clientPrismaRepository } from "@/infrastructure/repositories/client.repository";
import type { PatchPatientPortalProfileBody } from "@/lib/validators/patient-portal-profile";
import { digitsOnlyCpf } from "@/lib/validators/cpf";

export type PatchPatientPortalProfileResult =
  | {
      ok: true;
      client: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        documentId: string | null;
        postalCode: string | null;
        addressLine: string | null;
        addressNumber: string | null;
        addressComp: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        isMinor: boolean;
        guardianName: string | null;
        guardianDocumentId: string | null;
        guardianPhone: string | null;
        updatedAt: string;
      };
    }
  | { ok: false; code: "NOT_FOUND" | "CPF_INVALID" | "NO_FIELDS" };

export async function runPatchPatientPortalProfile(params: {
  tenantId: string;
  clientId: string;
  patch: PatchPatientPortalProfileBody;
}): Promise<PatchPatientPortalProfileResult> {
  const { tenantId, clientId, patch: p } = params;

  const existing = await clientPrismaRepository.findClientForPortalPatch(tenantId, clientId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const data: Prisma.ClientUncheckedUpdateInput = {};
  if (p.name !== undefined) data.name = p.name.trim();
  if (p.phone !== undefined) data.phone = p.phone.trim();
  if (p.email !== undefined) {
    data.email = p.email === "" ? null : p.email.trim();
  }
  if (p.documentId !== undefined) {
    const d = digitsOnlyCpf(p.documentId);
    if (existing.isMinor) {
      if (d.length > 0 && d.length !== 11) {
        return { ok: false, code: "CPF_INVALID" };
      }
      data.documentId = d.length === 0 ? null : d;
    } else {
      if (d.length !== 11) {
        return { ok: false, code: "CPF_INVALID" };
      }
      data.documentId = d;
    }
  }
  if (p.postalCode !== undefined) data.postalCode = p.postalCode;
  if (p.addressLine !== undefined) data.addressLine = p.addressLine;
  if (p.addressNumber !== undefined) data.addressNumber = p.addressNumber;
  if (p.addressComp !== undefined) data.addressComp = p.addressComp;
  if (p.neighborhood !== undefined) data.neighborhood = p.neighborhood;
  if (p.city !== undefined) data.city = p.city;
  if (p.state !== undefined) data.state = p.state;

  if (Object.keys(data).length === 0) {
    return { ok: false, code: "NO_FIELDS" };
  }

  const row = (await clientPrismaRepository.updatePatientPortalProfile(
    existing.id,
    data,
  )) as {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    documentId: string | null;
    postalCode: string | null;
    addressLine: string | null;
    addressNumber: string | null;
    addressComp: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    isMinor: boolean;
    guardianName: string | null;
    guardianDocumentId: string | null;
    guardianPhone: string | null;
    updatedAt: Date;
  };

  revalidateTenantClientsList(tenantId);

  return {
    ok: true,
    client: {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      documentId: row.documentId,
      postalCode: row.postalCode,
      addressLine: row.addressLine,
      addressNumber: row.addressNumber,
      addressComp: row.addressComp,
      neighborhood: row.neighborhood,
      city: row.city,
      state: row.state,
      isMinor: row.isMinor,
      guardianName: row.guardianName,
      guardianDocumentId: row.guardianDocumentId,
      guardianPhone: row.guardianPhone,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}
