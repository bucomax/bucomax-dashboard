"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { ReportsSummaryResponseData } from "@/features/dashboard/types/api";
import { formatPhoneBrDisplay } from "@/lib/validators/phone";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

type ReportsCriticalPatientsCardProps = {
  criticalPatients: ReportsSummaryResponseData["criticalPatients"];
  loading: boolean;
  onPageChange: (nextPage: number) => void;
};

export function ReportsCriticalPatientsCard({
  criticalPatients,
  loading,
  onPageChange,
}: ReportsCriticalPatientsCardProps) {
  const t = useTranslations("dashboard.reports");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("criticalTitle")}</CardTitle>
        <CardDescription>{t("criticalDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalPatients.data.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
            {t("empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {criticalPatients.data.map((row) => (
              <div
                key={row.patientPathwayId}
                className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium">{row.clientName}</p>
                  <p className="text-muted-foreground text-sm">
                    {row.pathwayName} · {row.stageName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("criticalDays", { days: row.daysInStage })} · {formatPhoneBrDisplay(row.phone)}
                    {row.opmeSupplierName ? ` · ${row.opmeSupplierName}` : ""}
                  </p>
                </div>
                <Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/dashboard/clients/${row.clientId}`} />}>
                  <UserRound className="size-4" />
                  {t("viewPatient")}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {t("range", {
              from:
                criticalPatients.pagination.totalItems === 0
                  ? 0
                  : (criticalPatients.pagination.page - 1) * criticalPatients.pagination.limit + 1,
              to:
                criticalPatients.pagination.totalItems === 0
                  ? 0
                  : Math.min(
                      criticalPatients.pagination.page * criticalPatients.pagination.limit,
                      criticalPatients.pagination.totalItems,
                    ),
              total: criticalPatients.pagination.totalItems,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!criticalPatients.pagination.hasPreviousPage || loading}
              onClick={() => onPageChange(Math.max(criticalPatients.pagination.page - 1, 1))}
            >
              <ChevronLeft className="size-4" />
              {t("prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!criticalPatients.pagination.hasNextPage || loading}
              onClick={() => onPageChange(criticalPatients.pagination.page + 1)}
            >
              {t("next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
