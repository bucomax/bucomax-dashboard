import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("patientPortal");
  return { title: t("landing.title") };
}

export default async function PatientPortalLandingPage() {
  const t = await getTranslations("patientPortal");
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("landing.title")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t("landing.body")}</p>
      </div>
    </div>
  );
}
