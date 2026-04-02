"use client";

import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import type { PatientPathwayAssigneeOverviewDto, StageAssigneeSummaryDto } from "@/types/api/clients-v1";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

function assigneeDisplayName(u: StageAssigneeSummaryDto): string {
  const n = u.name?.trim();
  return n && n.length > 0 ? n : u.email;
}

export function ClientDetailAssigneeOverviewCard(props: {
  overview: PatientPathwayAssigneeOverviewDto;
  currentStageAssignee: StageAssigneeSummaryDto | null;
}) {
  const t = useTranslations("clients.detail.assigneeOverview");
  const { overview, currentStageAssignee } = props;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <ClientDetailCardTitle icon={Users}>{t("title")}</ClientDetailCardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("pastTitle")}</p>
          <p className="mt-1">
            {overview.enteredCurrentStageFrom ? overview.enteredCurrentStageFrom.name : t("startJourney")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("actor")}:{" "}
            {overview.lastTransitionActor ? assigneeDisplayName(overview.lastTransitionActor) : "—"}
          </p>
        </div>
        <div className="border-t pt-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("presentTitle")}</p>
          <p className="mt-1 font-medium">
            {currentStageAssignee ? assigneeDisplayName(currentStageAssignee) : t("noAssignee")}
          </p>
        </div>
        <div className="border-t pt-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("futureTitle")}</p>
          {overview.followingStages.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">{t("noFollowing")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {overview.followingStages.map((s) => (
                <li
                  key={s.id}
                  className="border-border/60 bg-muted/15 flex flex-col gap-0.5 rounded-md border px-3 py-2"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {t("defaultAssigneeLabel")}:{" "}
                    {s.defaultAssignees.length > 0
                      ? s.defaultAssignees.map(assigneeDisplayName).join(", ")
                      : s.defaultAssignee
                        ? assigneeDisplayName(s.defaultAssignee)
                        : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground mt-3 text-xs">{t("linearHint")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
