"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const PatientPortalTenantContext = createContext<string | null>(null);

export function PatientPortalTenantProvider({
  tenantSlug,
  children,
}: {
  /** `Tenant.slug` canônico (resolvido no servidor). */
  tenantSlug: string;
  children: ReactNode;
}) {
  return (
    <PatientPortalTenantContext.Provider value={tenantSlug}>{children}</PatientPortalTenantContext.Provider>
  );
}

export function usePatientPortalTenantSlug(): string {
  const v = useContext(PatientPortalTenantContext);
  if (!v) {
    throw new Error("usePatientPortalTenantSlug must be used inside PatientPortalTenantProvider");
  }
  return v;
}
