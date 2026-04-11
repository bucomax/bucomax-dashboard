import { AuthLayout } from "@/shared/components/layout/auth-layout";
import type { ReactNode } from "react";

/** Auto-cadastro legado (`/patient-self-register?token=`) — área mais larga no desktop. */
export default function LegacyPatientSelfRegisterLayout({ children }: { children: ReactNode }) {
  return <AuthLayout variant="wide">{children}</AuthLayout>;
}
