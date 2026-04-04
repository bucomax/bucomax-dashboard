import { revalidateTag } from "next/cache";
import {
  tenantClientsListTag,
  tenantOpmeSuppliersListTag,
  tenantPathwaysListTag,
} from "@/infrastructure/cache/cache-tags";

/** Após mudança em cliente, jornada do paciente ou etapa (lista/kanban refletem isso). */
export function revalidateTenantClientsList(tenantId: string): void {
  revalidateTag(tenantClientsListTag(tenantId), "default");
}

export function revalidateTenantPathwaysList(tenantId: string): void {
  revalidateTag(tenantPathwaysListTag(tenantId), "default");
}

export function revalidateTenantOpmeSuppliersList(tenantId: string): void {
  revalidateTag(tenantOpmeSuppliersListTag(tenantId), "default");
}

/** Publicação de jornada pode alterar nomes de etapa na UI de pacientes. */
export function revalidateTenantPathwaysAndClientsLists(tenantId: string): void {
  revalidateTenantPathwaysList(tenantId);
  revalidateTenantClientsList(tenantId);
}
