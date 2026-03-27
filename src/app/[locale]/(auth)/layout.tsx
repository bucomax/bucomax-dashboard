import { AuthLayout } from "@/shared/components/layout/auth-layout";

/**
 * Rotas públicas de autenticação: login, forgot/reset/invite — layout centralizado compartilhado.
 */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
