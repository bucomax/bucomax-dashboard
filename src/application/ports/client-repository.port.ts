export type ClientListFilters = {
  tenantId: string;
  search?: string;
  page?: number;
  limit?: number;
  assignedToUserId?: string;
  opmeSupplierId?: string;
  pathwayId?: string;
};

import type { ParsedPortalLogin } from "@/domain/auth/patient-portal-login-identifier";
import type { PatientPortalOverviewResponse, PortalClientForLogin } from "@/types/api/patient-portal-v1";

export type ClientUpsertInput = {
  tenantId: string;
  name: string;
  email?: string | null;
  phone: string;
  cpf?: string | null;
  birthDate?: Date | null;
  assignedToUserId?: string | null;
  opmeSupplierId?: string | null;
  notes?: string | null;
};

export interface IClientRepository {
  create(input: ClientUpsertInput): Promise<{ id: string }>;
  findById(tenantId: string, clientId: string): Promise<unknown | null>;
  findByIdWithPathways(tenantId: string, clientId: string): Promise<unknown | null>;
  findMany(filters: ClientListFilters): Promise<unknown[]>;
  findForPortalLogin(tenantId: string, parsed: ParsedPortalLogin): Promise<PortalClientForLogin | null>;
  update(tenantId: string, clientId: string, input: Partial<ClientUpsertInput>): Promise<unknown>;
  /** Soft delete; retorna false se nenhuma linha foi atualizada. */
  delete(tenantId: string, clientId: string, deletedByUserId: string): Promise<boolean>;

  findFirstWhere(where: unknown, select: unknown): Promise<unknown | null>;

  findClientAssigneeSummary(
    tenantId: string,
    clientId: string,
  ): Promise<{ id: string; assignedToUserId: string | null; opmeSupplierId: string | null } | null>;

  findClientsAssigneeFieldsByIds(
    tenantId: string,
    clientIds: string[],
  ): Promise<Array<{ id: string; assignedToUserId: string | null; opmeSupplierId: string | null }>>;

  listPatientNotesPage(
    tenantId: string,
    clientId: string,
    page: number,
    limit: number,
  ): Promise<{ totalItems: number; rows: unknown[] }>;

  createPatientNote(params: {
    tenantId: string;
    clientId: string;
    authorUserId: string;
    content: string;
  }): Promise<unknown>;

  findClientNameById(tenantId: string, clientId: string): Promise<string | null>;

  findClientForPortalPatch(
    tenantId: string,
    clientId: string,
  ): Promise<{ id: string; isMinor: boolean } | null>;

  /** `data` é `Prisma.ClientUncheckedUpdateInput` na implementação Prisma. */
  updatePatientPortalProfile(clientId: string, data: unknown): Promise<unknown>;

  loadPatientPortalOverview(
    tenantId: string,
    clientId: string,
  ): Promise<PatientPortalOverviewResponse | null>;

  findClientPortalPasswordRow(
    tenantId: string,
    clientId: string,
  ): Promise<{ id: string; portalPasswordHash: string | null } | null>;

  updatePatientPortalPasswordHash(
    clientId: string,
    portalPasswordHash: string,
    portalPasswordChangedAt: Date,
  ): Promise<void>;

  /** Select alinhado a `ClientDetailClientRow` + `portalPasswordHash` (ficha portal). */
  findClientForPatientPortalDetail(tenantId: string, clientId: string): Promise<unknown | null>;

  /** Listagem com `CLIENT_LIST_INCLUDE` (filtro de status SLA em memória). */
  findManyForClientsListScan(params: {
    where: unknown;
    skip: number;
    take: number;
  }): Promise<unknown[]>;

  /** Criação staff com select alinhado a `mapPrismaClientRowToClientDto`. */
  createClientStaff(data: unknown): Promise<unknown>;

  /** PATCH staff; `data` é `Prisma.ClientUncheckedUpdateInput`. */
  updateClientStaff(tenantId: string, clientId: string, data: unknown): Promise<unknown>;
}
