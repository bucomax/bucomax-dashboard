/** Tags `next/cache` para invalidação por tenant (dados multi-tenant). */

export function tenantClientsListTag(tenantId: string): string {
  return `tenant:${tenantId}:clients-list`;
}

export function tenantPathwaysListTag(tenantId: string): string {
  return `tenant:${tenantId}:pathways-list`;
}

export function tenantOpmeSuppliersListTag(tenantId: string): string {
  return `tenant:${tenantId}:opme-suppliers-list`;
}
