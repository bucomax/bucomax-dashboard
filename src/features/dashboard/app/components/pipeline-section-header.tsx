"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Columns3, Download, FileText, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

type PipelineSectionHeaderProps = {
  onOpenNewPatient: () => void;
  onExportCsv: () => void;
  exportDisabled: boolean;
};

export function PipelineSectionHeader({
  onOpenNewPatient,
  onExportCsv,
  exportDisabled,
}: PipelineSectionHeaderProps) {
  const t = useTranslations("dashboard.pipeline");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Columns3 className="size-5 text-primary" aria-hidden />
          {t("pipelineTitle")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("pipelineDescription")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={onOpenNewPatient}>
          <Plus className="size-4" />
          {t("newPatient")}
        </Button>
        <Button nativeButton={false} size="sm" variant="outline" render={<Link href="/dashboard/reports" />}>
          <FileText className="size-4" />
          {t("reports")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onExportCsv} disabled={exportDisabled}>
          <Download className="size-4" />
          {t("export")}
        </Button>
      </div>
    </div>
  );
}
