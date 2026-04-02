"use client";

import { AuthSuspenseFallback } from "@/features/auth/app/components/auth-suspense-fallback";
import {
  exchangePatientPortalToken,
} from "@/lib/api/patient-portal-client";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PatientPortalEnterPageInner() {
  const t = useTranslations("patientPortal");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void exchangePatientPortalToken(token)
      .then(() => {
        if (!cancelled) router.replace("/patient");
      })
      .catch(() => {
        if (!cancelled) setError(t("enter.error"));
      });
    return () => {
      cancelled = true;
    };
  }, [token, router, t]);

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

  return (
    <p className="text-muted-foreground text-sm">{t("enter.validating")}</p>
  );
}

export function PatientPortalEnterPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <PatientPortalEnterPageInner />
    </Suspense>
  );
}
