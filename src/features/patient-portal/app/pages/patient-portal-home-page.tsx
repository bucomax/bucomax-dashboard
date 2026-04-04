"use client";

import { ClientCompletedTreatmentsSection } from "@/features/clients/app/components/client-completed-treatments-section";
import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import {
  ClientDetailAssigneeSection,
  ClientDetailChecklistCard,
  ClientDetailJourneyCard,
  ClientDetailNextActionsCard,
} from "@/features/clients/app/components/client-detail-journey-panels";
import { ClientDetailProfileCard } from "@/features/clients/app/components/client-detail-profile-card";
import { usePatientPortalClientDetail } from "@/features/patient-portal/app/hooks/use-patient-portal-client-detail";
import { usePatientPortalTenantSlug } from "@/features/patient-portal/app/context/patient-portal-tenant-context";
import { PatientPortalAccessGate } from "@/features/patient-portal/app/components/patient-portal-access-gate";
import { PatientPortalFilesSection } from "@/features/patient-portal/app/components/patient-portal-files-section";
import { PatientPortalTimelineSection } from "@/features/patient-portal/app/components/patient-portal-timeline-section";
import {
  fetchPatientPortalTimeline,
  logoutPatientPortal,
  PatientPortalUnauthorizedError,
} from "@/lib/api/patient-portal-client";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { Info, MapPinned } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { PatientPortalTimelineResponseData } from "@/types/api/patient-portal-v1";

export function PatientPortalHomePage() {
  const tenantSlug = usePatientPortalTenantSlug();
  const t = useTranslations("patientPortal");
  const td = useTranslations("clients.detail");
  const locale = useLocale();
  const { data, error, loading, needsLink, reload } = usePatientPortalClientDetail(tenantSlug);
  const [timeline, setTimeline] = useState<PatientPortalTimelineResponseData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineRefresh, setTimelineRefresh] = useState(0);

  const loadTimeline = useCallback(() => {
    setTimelineLoading(true);
    setTimelineError(null);
    void fetchPatientPortalTimeline(tenantSlug, 1, 20)
      .then(setTimeline)
      .catch((e) => {
        if (e instanceof PatientPortalUnauthorizedError) {
          setTimeline(null);
          return;
        }
        setTimelineError(t("timeline.loadError"));
      })
      .finally(() => setTimelineLoading(false));
  }, [t, tenantSlug]);

  useEffect(() => {
    if (!data) return;
    loadTimeline();
  }, [data, loadTimeline, timelineRefresh]);

  const loadTimelinePage = useCallback(
    (page: number) => {
      setTimelineLoading(true);
      setTimelineError(null);
      void fetchPatientPortalTimeline(tenantSlug, page, 20)
        .then(setTimeline)
        .catch(() => setTimelineError(t("timeline.loadError")))
        .finally(() => setTimelineLoading(false));
    },
    [t, tenantSlug],
  );

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  async function onLogout() {
    await logoutPatientPortal();
    setTimeline(null);
    reload();
  }

  if (loading && !data) {
    return <p className="text-muted-foreground text-sm">{t("home.loading")}</p>;
  }

  if (needsLink) {
    return <PatientPortalAccessGate tenantSlug={tenantSlug} />;
  }

  if (error || !data) {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-muted-foreground text-sm">{error ?? t("home.loadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => reload()}>
          {t("home.retry")}
        </Button>
      </div>
    );
  }

  const { client, patientPathway: pp, completedTreatments = [] } = data;

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("home.welcome", { name: client.name })}</h1>
          <p className="text-muted-foreground text-sm">{t("home.clinic", { clinic: data.tenant.name })}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void onLogout()}>
          {t("home.logout")}
        </Button>
      </div>

      <div className="columns-1 gap-6 [column-fill:balance] lg:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
        <ClientDetailProfileCard
          clientId={client.id}
          client={client}
          variant="patient"
          tenantSlug={tenantSlug}
          onSaved={() => {
            reload();
            setTimelineRefresh((n) => n + 1);
          }}
        />

        {!pp ? (
          <Card className="min-w-0">
            <CardHeader>
              <ClientDetailCardTitle icon={MapPinned}>{td("noPathway.title")}</ClientDetailCardTitle>
              <CardDescription>
                {completedTreatments.length > 0
                  ? td("noPathway.portalCardDescriptionWithHistory")
                  : td("noPathway.portalCardDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <ClientDetailJourneyCard pp={pp} />
            <ClientDetailAssigneeSection pp={pp} />
            <ClientDetailNextActionsCard pp={pp} />
            <ClientDetailChecklistCard pp={pp} readOnly />
          </>
        )}

        <PatientPortalTimelineSection
          timeline={timeline}
          loading={timelineLoading}
          error={timelineError}
          onPageChange={loadTimelinePage}
          formatDateTime={formatDateTime}
        />

        <PatientPortalFilesSection formatDateTime={formatDateTime} onAfterUpload={() => loadTimelinePage(1)} />
      </div>

      <div className="[column-span:all] min-w-0 w-full">
        <ClientCompletedTreatmentsSection
          client={client}
          items={completedTreatments}
          enableFileDownload={false}
        />
      </div>

      <Alert variant="info" className="[column-span:all]">
        <Info className="size-4" aria-hidden />
        <AlertDescription className="text-sm">{t("home.readOnlyJourneyHint")}</AlertDescription>
      </Alert>

      <p className="text-muted-foreground text-center text-xs">
        <Link href="/login" className="underline underline-offset-2">
          {t("home.staffLogin")}
        </Link>
      </p>
    </div>
  );
}
