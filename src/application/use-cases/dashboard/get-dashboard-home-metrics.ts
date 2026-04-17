import type { IDashboardHomeRepository } from "@/application/ports/dashboard-home-repository.port";
import {
  calendarDayKeyInTimeZone,
  DASHBOARD_CHART_TIMEZONE,
  lastNCalendarDaysInTimeZone,
  startOfSaoPauloCalendarDay,
} from "@/lib/utils/dashboard-chart-calendar";

export type DashboardPathwayOption = {
  id: string;
  name: string;
  publishedVersion: { id: string; version: number } | null;
};

export type DashboardHomeMetrics = {
  pathwaysActive: number;
  transitionsToday: number;
  awaitingAction: number;
  pathwaysCompletedToday: number;
  conversionRate: number;
  transitionCountsByDay: Map<string, number>;
  completionsByDay: Map<string, number>;
  startsByDay: Map<string, number>;
  dayKeys7: string[];
};

export type GetDashboardHomeResult = {
  pathwayOptions: DashboardPathwayOption[];
  metrics: DashboardHomeMetrics;
};

const STALE_HOURS = 48;
const HISTORY_DAYS = 10;
const CHART_DAYS = 7;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 86_400_000;

export async function getDashboardHomeMetrics(
  tenantId: string,
  dashboardHome: IDashboardHomeRepository,
): Promise<GetDashboardHomeResult> {
  const now = new Date();
  const todayKeySp = calendarDayKeyInTimeZone(now, DASHBOARD_CHART_TIMEZONE);
  const startTodaySp = startOfSaoPauloCalendarDay(todayKeySp);
  const staleThreshold = new Date(now.getTime() - STALE_HOURS * MS_PER_HOUR);
  const historyFrom = new Date(now.getTime() - HISTORY_DAYS * MS_PER_DAY);

  const repo = dashboardHome;

  const [
    rawPathways,
    pathwaysActive,
    transitionsToday,
    awaitingAction,
    pathwaysCompletedToday,
    transitionsHistory,
    completionTimestamps,
    startTimestamps,
  ] = await Promise.all([
    repo.fetchPathwayOptions(tenantId),
    repo.countActivePathways(tenantId),
    repo.countTransitionsSince(tenantId, startTodaySp),
    repo.countAwaitingAction(tenantId, staleThreshold),
    repo.countCompletedSince(tenantId, startTodaySp),
    repo.findTransitionsSince(tenantId, historyFrom),
    repo.findCompletionTimestampsSince(tenantId, historyFrom),
    repo.findStartTimestampsSince(tenantId, historyFrom),
  ]);

  const pathwayOptions: DashboardPathwayOption[] = rawPathways.map((p) => ({
    id: p.id,
    name: p.name,
    publishedVersion: p.versions[0] ?? null,
  }));

  // Conversion rate: unique pathways with transitions in last 7 days / active
  const dayKeys7 = lastNCalendarDaysInTimeZone(now, CHART_DAYS, DASHBOARD_CHART_TIMEZONE);
  const calendarKeys7 = new Set(dayKeys7);

  const touchedLast7Days = new Set(
    transitionsHistory
      .filter((row) =>
        calendarKeys7.has(calendarDayKeyInTimeZone(row.createdAt, DASHBOARD_CHART_TIMEZONE)),
      )
      .map((row) => row.patientPathwayId),
  ).size;

  const conversionRate =
    pathwaysActive > 0 ? Math.round((touchedLast7Days / pathwaysActive) * 100) : 0;

  // Bucket transitions by calendar day
  const transitionCountsByDay = new Map<string, number>();
  for (const row of transitionsHistory) {
    const k = calendarDayKeyInTimeZone(row.createdAt, DASHBOARD_CHART_TIMEZONE);
    transitionCountsByDay.set(k, (transitionCountsByDay.get(k) ?? 0) + 1);
  }

  const completionsByDay = new Map<string, number>();
  for (const row of completionTimestamps) {
    const at = row.completedAt;
    if (!at) continue;
    const k = calendarDayKeyInTimeZone(at, DASHBOARD_CHART_TIMEZONE);
    completionsByDay.set(k, (completionsByDay.get(k) ?? 0) + 1);
  }

  const startsByDay = new Map<string, number>();
  for (const row of startTimestamps) {
    const k = calendarDayKeyInTimeZone(row.createdAt, DASHBOARD_CHART_TIMEZONE);
    startsByDay.set(k, (startsByDay.get(k) ?? 0) + 1);
  }

  return {
    pathwayOptions,
    metrics: {
      pathwaysActive,
      transitionsToday,
      awaitingAction,
      pathwaysCompletedToday,
      conversionRate,
      transitionCountsByDay,
      completionsByDay,
      startsByDay,
      dayKeys7,
    },
  };
}
