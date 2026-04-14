import { PatientPortalLoginPage } from "@/features/patient-portal/app/pages/patient-portal-login-page";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("patientPortal");
  return { title: t("login.title") };
}

export default function TenantPatientPortalLoginPage() {
  return <PatientPortalLoginPage />;
}
