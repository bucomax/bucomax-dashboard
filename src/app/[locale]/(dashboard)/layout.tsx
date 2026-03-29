import { redirect } from "next/navigation";
import { AppShell } from "@/shared/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";

/**
 * Rotas autenticadas sob `/dashboard/*`: shell compartilhado (shared), não feature.
 */
export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
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
