/**
 * Leituras agregadas para a home do dashboard (métricas + opções de fluxo).
 * Implementação: `DashboardHomePrismaRepository` em infrastructure.
 */
export type DashboardPathwayOptionRow = {
  id: string;
  name: string;
  versions: { id: string; version: number }[];
};

export type StageTransitionHistoryRow = {
  patientPathwayId: string;
  createdAt: Date;
};

export type CompletionTimestampRow = {
  completedAt: Date | null;
};

export type StartTimestampRow = {
  createdAt: Date;
};

export interface IDashboardHomeRepository {
  fetchPathwayOptions(tenantId: string): Promise<DashboardPathwayOptionRow[]>;
  countActivePathways(tenantId: string): Promise<number>;
  countTransitionsSince(tenantId: string, since: Date): Promise<number>;
  countAwaitingAction(tenantId: string, staleThreshold: Date): Promise<number>;
  countCompletedSince(tenantId: string, since: Date): Promise<number>;
  findTransitionsSince(tenantId: string, since: Date): Promise<StageTransitionHistoryRow[]>;
  findCompletionTimestampsSince(tenantId: string, since: Date): Promise<CompletionTimestampRow[]>;
  findStartTimestampsSince(tenantId: string, since: Date): Promise<StartTimestampRow[]>;
}
