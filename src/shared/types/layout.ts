/**
 * Dados mínimos da sessão para o shell do app autenticado (sidebar, header, tenant).
 * Não misturar com DTOs de domínio — só layout/navegação.
 */
export type AppShellUser = {
  id: string;
  email: string | null;
  name?: string | null;
  globalRole: string;
  tenantId?: string | null;
  tenantRole?: string | null;
};
