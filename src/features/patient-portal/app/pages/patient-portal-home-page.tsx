"use client";

import { PatientPortalFilesSection } from "@/features/patient-portal/app/components/patient-portal-files-section";
import { PatientPortalTimelineSection } from "@/features/patient-portal/app/components/patient-portal-timeline-section";
import {
  fetchPatientPortalOverview,
  fetchPatientPortalTimeline,
  logoutPatientPortal,
  PatientPortalUnauthorizedError,
} from "@/lib/api/patient-portal-client";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type {
  PatientPortalOverviewResponse,
  PatientPortalTimelineResponseData,
} from "@/types/api/patient-portal-v1";

export function PatientPortalHomePage() {
  const t = useTranslations("patientPortal");
  const locale = useLocale();
  const [data, setData] = useState<PatientPortalOverviewResponse | null>(null);
  const [timeline, setTimeline] = useState<PatientPortalTimelineResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [needsLink, setNeedsLink] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setTimelineError(null);
    setNeedsLink(false);
    void Promise.allSettled([fetchPatientPortalOverview(), fetchPatientPortalTimeline(1, 20)])
      .then((results) => {
        const [overviewResult, timelineResult] = results;
        if (overviewResult.status === "rejected") {
          const e = overviewResult.reason;
          if (e instanceof PatientPortalUnauthorizedError) {
            setData(null);
            setTimeline(null);
            setNeedsLink(true);
            return;
          }
          setError(t("home.loadError"));
          return;
        }
        setData(overviewResult.value);
        if (timelineResult.status === "fulfilled") {
          setTimeline(timelineResult.value);
        } else {
          setTimeline(null);
          setTimelineError(t("timeline.loadError"));
        }
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(id);
  }, [load]);

  const loadTimelinePage = useCallback(
    (page: number) => {
      setTimelineLoading(true);
      setTimelineError(null);
      void fetchPatientPortalTimeline(page, 20)
        .then((tl) => setTimeline(tl))
        .catch(() => setTimelineError(t("timeline.loadError")))
        .finally(() => setTimelineLoading(false));
    },
    [t],
  );

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
        dateStyle: "medium",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

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
    setData(null);
    setTimeline(null);
    load();
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">{t("home.loading")}</p>;
  }

  if (needsLink) {
    return (
      <div className="max-w-md space-y-2">
        <p className="text-muted-foreground text-sm">{t("home.needLink")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-muted-foreground text-sm">{error ?? t("home.loadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => load()}>
          {t("home.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("home.welcome", { name: data.client.name })}</h1>
          <p className="text-muted-foreground text-sm">{t("home.clinic", { clinic: data.tenant.name })}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void onLogout()}>
          {t("home.logout")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("home.journeyTitle")}</CardTitle>
          <CardDescription>
            {data.activeJourney ? data.activeJourney.pathwayName : t("home.journeyDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.activeJourney ? (
            <>
              <p>
                <span className="text-muted-foreground">{t("home.currentStage")}: </span>
                {data.activeJourney.currentStageName}
              </p>
              <p className="text-muted-foreground">
                {t("home.since", { date: formatDate(data.activeJourney.enteredStageAt) })}
              </p>
            </>
          ) : (
            <Alert variant="info">
              <Info className="size-4" aria-hidden />
              <AlertDescription>{t("home.noJourney")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <PatientPortalTimelineSection
        timeline={timeline}
        loading={timelineLoading}
        error={timelineError}
        onPageChange={loadTimelinePage}
        formatDateTime={formatDateTime}
      />

      <PatientPortalFilesSection formatDateTime={formatDateTime} onAfterUpload={() => loadTimelinePage(1)} />

      <p className="text-muted-foreground text-center text-xs">
        <Link href="/login" className="underline underline-offset-2">
          {t("home.staffLogin")}
        </Link>
      </p>
    </div>
  );
}
