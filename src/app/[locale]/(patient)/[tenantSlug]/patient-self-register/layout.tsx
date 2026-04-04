import { AuthLayout } from "@/shared/components/layout/auth-layout";
import { findActiveTenantBySlug } from "@/lib/tenants/resolve-public-tenant";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default async function TenantPatientSelfRegisterLayout({
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

  return <AuthLayout>{children}</AuthLayout>;
}
