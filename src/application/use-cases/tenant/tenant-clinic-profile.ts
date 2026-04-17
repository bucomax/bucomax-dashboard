import type {
  TenantClinicProfilePatchInput,
  TenantClinicProfileRow,
} from "@/application/ports/tenant-repository.port";
import { tenantPrismaRepository } from "@/infrastructure/repositories/tenant.repository";

export type TenantClinicDto = TenantClinicProfileRow;

export async function getTenantClinicProfile(tenantId: string): Promise<TenantClinicDto | null> {
  return tenantPrismaRepository.findTenantClinicProfileById(tenantId);
}

export async function updateTenantClinicProfile(
  tenantId: string,
  data: TenantClinicProfilePatchInput,
): Promise<TenantClinicDto> {
  return tenantPrismaRepository.updateTenantClinicProfile(tenantId, data);
}
