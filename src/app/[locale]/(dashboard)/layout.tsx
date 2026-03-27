import { redirect } from "@/i18n/navigation";
import { AppShell } from "@/shared/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";
import { getLocale } from "next-intl/server";

/**
 * Rotas autenticadas sob `/dashboard/*`: shell compartilhado (shared), não feature.
 */
export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) {
    const locale = await getLocale();
    redirect({ href: "/login?callbackUrl=/dashboard", locale });
  }

  const u = session!.user;

  return (
    <AppShell
      user={{
        id: u.id,
        email: u.email ?? null,
        name: u.name,
        globalRole: u.globalRole,
        tenantId: u.tenantId,
        tenantRole: u.tenantRole,
      }}
    >
      {children}
    </AppShell>
  );
}
