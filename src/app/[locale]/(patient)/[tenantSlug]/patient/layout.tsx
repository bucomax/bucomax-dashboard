import { PatientPortalTenantProvider } from "@/features/patient-portal/app/context/patient-portal-tenant-context";
import { findActiveTenantBySlug } from "@/application/use-cases/auth/resolve-public-tenant";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default async function TenantPatientPortalLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}>) {
  const { tenantSlug: raw } = await params;
  const tenant = await findActiveTenantBySlug(raw.trim());
  if (!tenant) {
    notFound();
  }

  return (
    <PatientPortalTenantProvider tenantSlug={tenant.slug}>
      <div className="bg-background min-h-svh">
        <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col overflow-x-auto px-4 py-10">
          {children}
        </div>
      </div>
    </PatientPortalTenantProvider>
  );
}
