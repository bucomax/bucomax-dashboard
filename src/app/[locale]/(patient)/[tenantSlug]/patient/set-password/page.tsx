import { PatientPortalSetPasswordPage } from "@/features/patient-portal/app/pages/patient-portal-set-password-page";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("patientPortal");
  return { title: t("setPassword.title") };
}

export default function PatientSetPasswordRoutePage() {
  return <PatientPortalSetPasswordPage />;
}
