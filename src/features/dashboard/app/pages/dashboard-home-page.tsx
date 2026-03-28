import { prisma } from "@/infrastructure/database/prisma";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import type { AppShellUser } from "@/shared/types/layout";
import { getTranslations } from "next-intl/server";

type DashboardHomePageProps = {
  user: AppShellUser;
};

export async function DashboardHomePage({ user }: DashboardHomePageProps) {
  const t = await getTranslations("dashboard.home");
  const tenantId = user.tenantId ?? null;

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const metrics = tenantId
    ? await (async () => {
        const [inProgress, completedToday, awaitingAction, transitionsLast7Days] = await Promise.all([
          prisma.patientPathway.count({
            where: { tenantId },
          }),
          prisma.stageTransition.count({
            where: {
              createdAt: { gte: startToday },
              patientPathway: { tenantId },
            },
          }),
          prisma.patientPathway.count({
            where: {
              tenantId,
              updatedAt: { lte: staleThreshold },
            },
          }),
          prisma.stageTransition.findMany({
            where: {
              createdAt: { gte: sevenDaysAgo },
              patientPathway: { tenantId },
            },
            select: { patientPathwayId: true, createdAt: true },
          }),
        ]);

        const touchedLast7Days = new Set(transitionsLast7Days.map((row) => row.patientPathwayId)).size;
        const conversionRate =
          inProgress > 0 ? Math.round((touchedLast7Days / inProgress) * 100) : 0;

        return {
          inProgress,
          completedToday,
          awaitingAction,
          conversionRate,
          transitionsLast7Days,
        };
      })()
    : {
        inProgress: 0,
        completedToday: 0,
        awaitingAction: 0,
        conversionRate: 0,
        transitionsLast7Days: [] as { patientPathwayId: string; createdAt: Date }[],
      };

  const dayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
  const dailyTransitionChart = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startToday);
    day.setDate(startToday.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const count = metrics.transitionsLast7Days.filter(
      (row) => row.createdAt >= day && row.createdAt < nextDay,
    ).length;
    return {
      label: dayFormatter.format(day).replace(".", ""),
      count,
    };
  });
  const maxDailyTransitions = Math.max(...dailyTransitionChart.map((item) => item.count), 1);

  const distributionChart = [
    { label: t("charts.distribution.awaiting"), value: metrics.awaitingAction },
    {
      label: t("charts.distribution.active"),
      value: Math.max(metrics.inProgress - metrics.awaitingAction, 0),
    },
    { label: t("charts.distribution.completedToday"), value: metrics.completedToday },
  ];
  const distributionTotal = distributionChart.reduce((sum, item) => sum + item.value, 0);
  const insights = [
    t("insights.first", { count: metrics.awaitingAction }),
    t("insights.second", { count: metrics.completedToday }),
    t("insights.third", { percent: metrics.conversionRate }),
  ];

  return (
    <DashboardPage title={t("title")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <p className="text-muted-foreground text-xs">{t("cards.inProgress")}</p>
          <p className="mt-2 text-2xl font-semibold">{metrics.inProgress}</p>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <p className="text-muted-foreground text-xs">{t("cards.completedToday")}</p>
          <p className="mt-2 text-2xl font-semibold">{metrics.completedToday}</p>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <p className="text-muted-foreground text-xs">{t("cards.awaitingAction")}</p>
          <p className="mt-2 text-2xl font-semibold">{metrics.awaitingAction}</p>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <p className="text-muted-foreground text-xs">{t("cards.conversionRate")}</p>
          <p className="mt-2 text-2xl font-semibold">{metrics.conversionRate}%</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground mb-3 text-sm font-medium">{t("insights.title")}</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
            {insights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground mb-4 text-sm font-medium">{t("charts.transitions7d")}</p>
          <div className="flex h-36 items-end gap-2">
            {dailyTransitionChart.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="bg-primary/80 w-full rounded-sm"
                  style={{ height: `${Math.max((item.count / maxDailyTransitions) * 100, 6)}%` }}
                />
                <span className="text-muted-foreground text-[11px]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground mb-4 text-sm font-medium">{t("charts.distribution.title")}</p>
          <div className="space-y-3">
            {distributionChart.map((item) => {
              const pct = distributionTotal > 0 ? Math.round((item.value / distributionTotal) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">
                      {item.value} ({pct}%)
                    </span>
                  </div>
                  <div className="bg-muted h-2 rounded-full">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
