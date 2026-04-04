import type { GlobalRole, Prisma, TenantRole } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/infrastructure/database/prisma";
import { buildKanbanClientNestedWhere } from "@/lib/pathway/kanban-client-where";

/** Escopo de visibilidade de pacientes derivado do `TenantMembership` (e super_admin). */
export type TenantMembershipClientScope = {
  role: TenantRole;
  restrictedToAssignedOnly: boolean;
  linkedOpmeSupplierId: string | null;
};

const EMPTY_WHERE: Prisma.ClientWhereInput = {};

/** Membership ausente no tenant: mesmo default que `loadTenantMembershipClientScope`. */
export function clientScopeFromTenantMembershipRow(
  membership: {
    role: TenantRole;
    restrictedToAssignedOnly: boolean;
    linkedOpmeSupplierId: string | null;
  } | null,
): TenantMembershipClientScope {
  if (!membership) {
    return {
      role: "tenant_user",
      restrictedToAssignedOnly: true,
      linkedOpmeSupplierId: null,
    };
  }
  return {
    role: membership.role,
    restrictedToAssignedOnly: membership.restrictedToAssignedOnly,
    linkedOpmeSupplierId: membership.linkedOpmeSupplierId,
  };
}

/**
 * Carrega flags de escopo no tenant ativo.
 * `super_admin` não tem membership: retorna escopo equivalente a `tenant_admin` (vê tudo no tenant do contexto).
 */
export async function loadTenantMembershipClientScope(
  userId: string,
  tenantId: string,
  globalRole: GlobalRole | string,
): Promise<TenantMembershipClientScope> {
  if (globalRole === "super_admin") {
    return {
      role: "tenant_admin",
      restrictedToAssignedOnly: false,
      linkedOpmeSupplierId: null,
    };
  }

  const m = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: {
      role: true,
      restrictedToAssignedOnly: true,
      linkedOpmeSupplierId: true,
    },
  });

  return clientScopeFromTenantMembershipRow(m);
}

/** `metadata.clientId` em payloads de notificação / JSON plano. */
export function getClientIdFromPlainMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (metadata == null) return null;
  const raw = metadata.clientId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/** `tenant_admin` (e super_admin tratado como tal) ignora restrições. */
export function buildClientVisibilityWhereInput(
  scope: TenantMembershipClientScope,
  viewerUserId: string,
): Prisma.ClientWhereInput {
  if (scope.role === "tenant_admin") {
    return EMPTY_WHERE;
  }

  const parts: Prisma.ClientWhereInput[] = [];
  if (scope.linkedOpmeSupplierId) {
    parts.push({ opmeSupplierId: scope.linkedOpmeSupplierId });
  }
  if (scope.restrictedToAssignedOnly) {
    parts.push({ assignedToUserId: viewerUserId });
  }

  if (parts.length === 0) return EMPTY_WHERE;
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

export function mergeClientWhereWithVisibility(
  base: Prisma.ClientWhereInput,
  scope: TenantMembershipClientScope,
  viewerUserId: string,
): Prisma.ClientWhereInput {
  const v = buildClientVisibilityWhereInput(scope, viewerUserId);
  if (Object.keys(v).length === 0) return base;
  return { AND: [base, v] };
}

/** `client` aninhado em `PatientPathwayWhereInput` (Kanban / dashboard). */
export function mergeKanbanClientNestedWhereWithVisibility(
  nested: Prisma.ClientWhereInput,
  scope: TenantMembershipClientScope,
  viewerUserId: string,
): Prisma.ClientWhereInput {
  return mergeClientWhereWithVisibility(nested, scope, viewerUserId);
}

export function buildClientDetailWhere(
  tenantId: string,
  clientId: string,
  scope: TenantMembershipClientScope,
  viewerUserId: string,
): Prisma.ClientWhereInput {
  const base: Prisma.ClientWhereInput = {
    id: clientId,
    tenantId,
    deletedAt: null,
  };
  return mergeClientWhereWithVisibility(base, scope, viewerUserId);
}

/** `findFirst` do paciente respeitando escopo RBAC do membro no tenant. */
/** Filtro aninhado `PatientPathway.client` para Kanban/dashboard com RBAC. */
export async function buildKanbanClientWhereForSession(
  session: Session,
  tenantId: string,
  search: string,
  opmeSupplierId: string | undefined,
): Promise<Prisma.ClientWhereInput> {
  const scope = await loadTenantMembershipClientScope(
    session.user.id,
    tenantId,
    session.user.globalRole,
  );
  const nested = buildKanbanClientNestedWhere(search, opmeSupplierId);
  return mergeKanbanClientNestedWhereWithVisibility(nested, scope, session.user.id);
}

export async function findTenantClientVisibleToSession<S extends Prisma.ClientSelect>(
  session: Session,
  tenantId: string,
  clientId: string,
  select: S,
): Promise<Prisma.ClientGetPayload<{ select: S }> | null> {
  const scope = await loadTenantMembershipClientScope(
    session.user.id,
    tenantId,
    session.user.globalRole,
  );
  return prisma.client.findFirst({
    where: buildClientDetailWhere(tenantId, clientId, scope, session.user.id),
    select,
  });
}

export function canViewClientRow(
  client: { assignedToUserId: string | null; opmeSupplierId: string | null },
  scope: TenantMembershipClientScope,
  viewerUserId: string,
): boolean {
  if (scope.role === "tenant_admin") return true;
  if (scope.linkedOpmeSupplierId && client.opmeSupplierId !== scope.linkedOpmeSupplierId) {
    return false;
  }
  if (scope.restrictedToAssignedOnly && client.assignedToUserId !== viewerUserId) {
    return false;
  }
  return true;
}

/**
 * Mantém apenas usuários que enxergam o paciente no tenant (OPME + só atribuídos + admin).
 * Consultas em lote para muitos destinatários (ex.: «todos os membros» com `metadata.clientId`).
 */
export async function filterUserIdsWhoCanViewClient(
  tenantId: string,
  clientId: string,
  candidateUserIds: string[],
): Promise<string[]> {
  const unique = [...new Set(candidateUserIds)];
  if (unique.length === 0) return [];

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId, deletedAt: null },
    select: { id: true, assignedToUserId: true, opmeSupplierId: true },
  });
  if (!client) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, globalRole: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId, userId: { in: unique } },
    select: {
      userId: true,
      role: true,
      restrictedToAssignedOnly: true,
      linkedOpmeSupplierId: true,
    },
  });
  const membershipByUserId = new Map(memberships.map((m) => [m.userId, m]));

  const result: string[] = [];
  for (const uid of unique) {
    const u = userById.get(uid);
    if (!u) continue;

    const scope: TenantMembershipClientScope =
      u.globalRole === "super_admin"
        ? {
            role: "tenant_admin",
            restrictedToAssignedOnly: false,
            linkedOpmeSupplierId: null,
          }
        : clientScopeFromTenantMembershipRow(membershipByUserId.get(uid) ?? null);

    if (canViewClientRow(client, scope, uid)) {
      result.push(uid);
    }
  }
  return result;
}

function metadataClientId(metadata: unknown): string | null {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { clientId?: unknown }).clientId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/** Aviso ao tenant inteiro (in-app + lista); não esconder para membros com escopo “só atribuídos”. */
function metadataSourceIsPatientSelfRegister(metadata: unknown): boolean {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as { source?: unknown }).source === "patient_self_register";
}

type NotificationRow = { id: string; metadata: Prisma.JsonValue | null };

/**
 * Filtra notificações cujo `metadata.clientId` aponta para paciente fora do escopo.
 * Notificações **sem** `clientId` no metadata permanecem (ex.: evoluções futuras).
 */
export async function filterNotificationsByClientScope(
  rows: NotificationRow[],
  tenantId: string,
  scope: TenantMembershipClientScope,
  viewerUserId: string,
): Promise<NotificationRow[]> {
  if (scope.role === "tenant_admin") return rows;
  if (!scope.restrictedToAssignedOnly && !scope.linkedOpmeSupplierId) return rows;

  const clientIds = [...new Set(rows.map((r) => metadataClientId(r.metadata)).filter(Boolean))] as string[];
  if (clientIds.length === 0) return rows;

  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds }, tenantId, deletedAt: null },
    select: { id: true, assignedToUserId: true, opmeSupplierId: true },
  });
  const map = new Map(clients.map((c) => [c.id, c]));

  return rows.filter((n) => {
    if (metadataSourceIsPatientSelfRegister(n.metadata)) return true;
    const cid = metadataClientId(n.metadata);
    if (!cid) return true;
    const c = map.get(cid);
    if (!c) return false;
    return canViewClientRow(c, scope, viewerUserId);
  });
}
