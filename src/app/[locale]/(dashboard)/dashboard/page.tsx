import { DashboardHomePage } from "@/features/dashboard/app/pages/dashboard-home-page";
import { getSession } from "@/lib/auth/session";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  const u = session.user;

  return (
    <DashboardHomePage
      user={{
        id: u.id,
        email: u.email ?? null,
        name: u.name,
        globalRole: u.globalRole,
        tenantId: u.tenantId,
        tenantRole: u.tenantRole,
      }}
    />
  );
}
