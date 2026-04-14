"use client";

import { patientPortalTimelineRow } from "@/features/patient-portal/app/utils/portal-timeline-lines";
import { AuditTimelineList } from "@/shared/components/timeline/audit-timeline-list";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PatientPortalTimelineResponseData } from "@/types/api/patient-portal-v1";

type Props = {
  timeline: PatientPortalTimelineResponseData | null;
  loading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  formatDateTime: (iso: string) => string;
};

export function PatientPortalTimelineSection({
  timeline,
  loading,
  error,
  onPageChange,
  formatDateTime,
}: Props) {
  const t = useTranslations("patientPortal");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("timeline.title")}</CardTitle>
        <CardDescription>{t("timeline.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}

        {loading && !timeline ? (
          <p className="text-muted-foreground text-sm">{t("home.loading")}</p>
        ) : null}

        {!loading && timeline && timeline.items.length === 0 ? (
          <Alert variant="info">
            <Info className="size-4" aria-hidden />
            <AlertDescription>{t("timeline.empty")}</AlertDescription>
          </Alert>
        ) : null}

        {timeline && timeline.items.length > 0 ? (
          <AuditTimelineList
            rows={timeline.items.map((item) =>
              patientPortalTimelineRow(
                item,
                t as (key: string, values?: Record<string, string>) => string,
                formatDateTime,
              ),
            )}
          />
        ) : null}

        {timeline?.timelineCapped ? (
          <p className="text-muted-foreground text-xs">{t("timeline.capped")}</p>
        ) : null}

        {timeline && timeline.pagination.totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              {t("timeline.page", {
                page: timeline.pagination.page,
                totalPages: timeline.pagination.totalPages,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || timeline.pagination.page <= 1}
                onClick={() => onPageChange(timeline.pagination.page - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
                {t("timeline.prev")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || timeline.pagination.page >= timeline.pagination.totalPages}
                onClick={() => onPageChange(timeline.pagination.page + 1)}
              >
                {t("timeline.next")}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
