import { LegalDocumentView } from "@/features/legal/app/components/legal-document-view";
import { PUBLIC_SELF_REGISTER_PRIVACY_VERSION } from "@/lib/constants/public-registration-consent";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("privacy.pageTitle") };
}

export default async function LegalPrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <LegalDocumentView locale={locale} document="privacy" version={PUBLIC_SELF_REGISTER_PRIVACY_VERSION} />
  );
}
