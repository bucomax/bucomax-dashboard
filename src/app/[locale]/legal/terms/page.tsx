import { LegalDocumentView } from "@/features/legal/app/components/legal-document-view";
import { PUBLIC_SELF_REGISTER_TERMS_VERSION } from "@/lib/constants/public-registration-consent";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("terms.pageTitle") };
}

export default async function LegalTermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <LegalDocumentView locale={locale} document="terms" version={PUBLIC_SELF_REGISTER_TERMS_VERSION} />
  );
}
