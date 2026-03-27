import type { Session } from "next-auth";
import { prisma } from "@/infrastructure/database/prisma";
import { getSession } from "./session";
import { jsonError } from "@/lib/api-response";

export async function requireSession(): Promise<Session | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireSessionOr401() {
  const session = await requireSession();
  if (!session) {
    return { session: null, response: jsonError("UNAUTHORIZED", "Sessão ausente ou inválida.", 401) };
  }
  return { session, response: null };
}

export function requireSuperAdmin(session: Session) {
  return session.user.globalRole === "super_admin";
}

export function superAdminOr403(session: Session) {
  if (!requireSuperAdmin(session)) {
    return jsonError("FORBIDDEN", "Apenas super_admin.", 403);
  }
  return null;
}

/** `super_admin` ou `tenant_admin` do tenant informado. */
export async function assertTenantInvitePermission(session: Session, tenantId: string) {
  if (session.user.globalRole === "super_admin") {
    return null;
  }
  const m = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: session.user.id, tenantId } },
  });
  if (!m || m.role !== "tenant_admin") {
    return jsonError("FORBIDDEN", "Sem permissão para convidar neste tenant.", 403);
  }
  return null;
}

/** `super_admin` ou `tenant_admin` do tenant (gestão de membros). */
export async function assertTenantAdminOrSuper(session: Session, tenantId: string) {
  if (session.user.globalRole === "super_admin") {
    return null;
  }
  const m = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: session.user.id, tenantId } },
  });
  if (!m || m.role !== "tenant_admin") {
    return jsonError("FORBIDDEN", "Sem permissão para gerir membros neste tenant.", 403);
  }
  return null;
}

/** Operações escopadas ao tenant ativo da sessão (`POST /auth/context`). */
export function getActiveTenantIdOr400(session: Session) {
  const tenantId = session.user.tenantId ?? null;
  if (!tenantId) {
    return { tenantId: null, response: jsonError("TENANT_REQUIRED", "Selecione um tenant ativo.", 400) };
  }
  return { tenantId, response: null };
}
