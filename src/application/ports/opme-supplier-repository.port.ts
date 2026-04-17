export type CreateOpmeSupplierResult =
  | { ok: true; supplier: { id: string; name: string; active: boolean; activePatientsCount: number } }
  | { ok: false; code: "NAME_CONFLICT" };

export interface IOpmeSupplierRepository {
  findById(tenantId: string, supplierId: string): Promise<unknown | null>;
  findMany(tenantId: string): Promise<unknown[]>;
  findActive(tenantId: string): Promise<unknown[]>;

  createIfUniqueName(tenantId: string, name: string): Promise<CreateOpmeSupplierResult>;
}
