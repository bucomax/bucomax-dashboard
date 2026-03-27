import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      globalRole: string;
      /** Tenant ativo (persistido em `User.activeTenantId`). */
      tenantId?: string | null;
      /** Papel no tenant ativo; `null` se super_admin sem membership neste tenant. */
      tenantRole?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    globalRole?: string;
    /** Conta desativada (soft delete) — sessão deve ser tratada como inválida. */
    invalid?: boolean;
  }
}
