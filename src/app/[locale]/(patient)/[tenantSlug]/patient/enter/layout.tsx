import type { ReactNode } from "react";

/** Largura mínima alinhada ao container do portal (720px). */
export default function TenantPatientPortalEnterLayout({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-[720px]">{children}</div>;
}
