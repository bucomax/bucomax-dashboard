"use client";

import { usePatientPortalTenantSlug } from "@/features/patient-portal/app/context/patient-portal-tenant-context";
import { PatientPortalFullScreenLoading } from "@/features/patient-portal/app/components/patient-portal-full-screen-loading";
import { exchangePatientPortalToken } from "@/lib/api/patient-portal-client";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PatientPortalEnterPageInner() {
  const tenantSlug = usePatientPortalTenantSlug();
  const t = useTranslations("patientPortal");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void exchangePatientPortalToken(tenantSlug, token)
      .then(() => {
        if (!cancelled) router.replace(`/${tenantSlug}/patient`);
      })
      .catch(() => {
        if (!cancelled) setError(t("enter.error"));
      });
    return () => {
      cancelled = true;
    };
  }, [token, router, t, tenantSlug]);

  if (!token) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertDescription>{t("enter.error")}</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return <PatientPortalFullScreenLoading message={t("enter.validating")} showMessage={false} />;
}

export function PatientPortalEnterPage() {
  const t = useTranslations("patientPortal");
  return (
    <Suspense fallback={<PatientPortalFullScreenLoading message={t("enter.validating")} showMessage={false} />}>
      <PatientPortalEnterPageInner />
    </Suspense>
  );
}
