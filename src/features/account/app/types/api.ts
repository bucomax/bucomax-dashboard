/** Resposta de `GET /api/v1/me` (campo `data.user`). */
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
  role: string;
};
