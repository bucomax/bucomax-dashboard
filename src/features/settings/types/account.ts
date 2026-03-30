export type TenantRole = "tenant_admin" | "tenant_user";

export type MeUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: string | null;
  globalRole: string;
  tenantId: string | null;
  tenantRole: string | null;
  createdAt: string;
};

export type TenantMemberRow = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: TenantRole;
};

export type AdminInviteInput = {
  email: string;
  name?: string;
  tenantId: string;
  role: TenantRole;
};

export type AdminInviteResult = {
  message: string;
  email: string;
  /** Quando false, nenhum e-mail foi enviado (ex.: usuário já tinha senha e só foi readicionado ao tenant). */
  emailDispatched?: boolean;
};
