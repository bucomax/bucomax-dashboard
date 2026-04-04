import { PatientPortalHomePage } from "@/features/patient-portal/app/pages/patient-portal-home-page";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("patientPortal");
  return { title: t("title") };
}

export default function TenantPatientPortalHomePage() {
  return <PatientPortalHomePage />;
}
