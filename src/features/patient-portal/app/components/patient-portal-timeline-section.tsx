"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PatientPortalTimelineItemDto } from "@/types/api/patient-portal-v1";
import type { PatientPortalTimelineResponseData } from "@/types/api/patient-portal-v1";

function payloadStr(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === "string" ? v : undefined;
}

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

  function lineForItem(item: PatientPortalTimelineItemDto): string {
    if (item.kind === "legacy_transition") {
      return t("timeline.fromTo", {
        from: item.fromStage?.name ?? "—",
        to: item.toStage.name,
      });
    }
    switch (item.type) {
      case "STAGE_TRANSITION": {
        const from = payloadStr(item.payload, "fromStageName");
        const to = payloadStr(item.payload, "toStageName");
        if (from || to) {
          return t("timeline.fromTo", { from: from ?? "—", to: to ?? "—" });
        }
        return t("timeline.stageTransition");
      }
      case "FILE_UPLOADED_TO_CLIENT":
        return t("timeline.fileUpload");
      case "PATIENT_PORTAL_FILE_SUBMITTED":
        return t("timeline.portalFileSubmitted");
      case "PATIENT_PORTAL_FILE_APPROVED":
        return t("timeline.portalFileApproved");
      case "PATIENT_PORTAL_FILE_REJECTED":
        return t("timeline.portalFileRejected");
      case "SELF_REGISTER_COMPLETED":
        return t("timeline.selfRegister");
      default:
        return t("timeline.event");
    }
  }

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
          <ul className="border-border divide-border divide-y rounded-lg border text-sm">
            {timeline.items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="space-y-0.5 px-3 py-3">
                <p className="text-foreground font-medium">{lineForItem(item)}</p>
                <p className="text-muted-foreground text-xs">{formatDateTime(item.createdAt)}</p>
                {item.kind === "audit" && item.actorName ? (
                  <p className="text-muted-foreground text-xs">{t("timeline.by", { name: item.actorName })}</p>
                ) : null}
              </li>
            ))}
          </ul>
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
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
