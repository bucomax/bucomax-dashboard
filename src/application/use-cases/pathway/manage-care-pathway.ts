import {
  revalidateTenantPathwaysAndClientsLists,
  revalidateTenantPathwaysList,
} from "@/infrastructure/cache/revalidate-tenant-lists";
import { pathwayPrismaRepository } from "@/infrastructure/repositories/pathway.repository";

export async function getCarePathwayDetail(tenantId: string, pathwayId: string) {
  const row = await pathwayPrismaRepository.findById(tenantId, pathwayId);
  if (!row || typeof row !== "object") return null;
  const p = row as {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    versions: { id: string; version: number; published: boolean; createdAt: Date }[];
  };
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    versions: p.versions.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type PatchCarePathwayResult =
  | { ok: true; pathway: { id: string; name: string; description: string | null; updatedAt: string } }
  | { ok: false; code: "NOT_FOUND" | "NO_FIELDS_TO_UPDATE" };

export async function runPatchCarePathway(params: {
  tenantId: string;
  pathwayId: string;
  patch: { name?: string; description?: string | null };
}): Promise<PatchCarePathwayResult> {
  const { tenantId, pathwayId, patch: p } = params;
  const data: { name?: string; description?: string | null } = {};
  if (p.name !== undefined) data.name = p.name.trim();
  if (p.description !== undefined) {
    data.description = p.description === null ? null : p.description.trim() || null;
  }
  if (Object.keys(data).length === 0) {
    return { ok: false, code: "NO_FIELDS_TO_UPDATE" };
  }

  const row = await pathwayPrismaRepository.updateCarePathway(tenantId, pathwayId, data);
  if (!row || typeof row !== "object") {
    return { ok: false, code: "NOT_FOUND" };
  }
  const pathway = row as { id: string; name: string; description: string | null; updatedAt: Date };

  revalidateTenantPathwaysAndClientsLists(tenantId);

  return {
    ok: true,
    pathway: {
      id: pathway.id,
      name: pathway.name,
      description: pathway.description,
      updatedAt: pathway.updatedAt.toISOString(),
    },
  };
}

export type DeleteCarePathwayResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "PATHWAY_IN_USE" };

export async function runDeleteCarePathway(
  tenantId: string,
  pathwayId: string,
): Promise<DeleteCarePathwayResult> {
  const existing = await pathwayPrismaRepository.findById(tenantId, pathwayId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const inUse = await pathwayPrismaRepository.countPatientPathwaysForPathway(pathwayId);
  if (inUse > 0) {
    return { ok: false, code: "PATHWAY_IN_USE" };
  }

  const deleted = await pathwayPrismaRepository.deleteCarePathway(tenantId, pathwayId);
  if (!deleted) {
    return { ok: false, code: "NOT_FOUND" };
  }

  revalidateTenantPathwaysList(tenantId);
  return { ok: true };
}
