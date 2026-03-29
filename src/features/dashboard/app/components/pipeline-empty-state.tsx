"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useTranslations } from "next-intl";

export function PipelineEmptyState() {
  const t = useTranslations("dashboard.pipeline");

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>{t("pipelineTitle")}</CardTitle>
        <CardDescription>{t("noPublishedPathway")}</CardDescription>
      </CardHeader>
    </Card>
  );
}
