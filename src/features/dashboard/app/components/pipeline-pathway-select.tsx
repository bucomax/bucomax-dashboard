"use client";

import type { DashboardPathwayOption } from "@/features/dashboard/types";
import { LabeledSelect } from "@/shared/components/forms/labeled-select";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

type PipelinePathwaySelectProps = {
  pathways: DashboardPathwayOption[];
  value: string;
  onValueChange: (pathwayId: string) => void;
};

export function PipelinePathwaySelect({ pathways, value, onValueChange }: PipelinePathwaySelectProps) {
  const t = useTranslations("dashboard.pipeline");

  const options = useMemo(
    () => pathways.map((p) => ({ value: p.id, label: p.name })),
    [pathways],
  );

  return (
    <LabeledSelect
      id="dash-pathway"
      className="max-w-xs"
      label={t("pathwayLabel")}
      value={value}
      onValueChange={onValueChange}
      options={options}
    />
  );
}
