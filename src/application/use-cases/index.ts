/**
 * Camada de aplicação (Fase 4 — REFACTOR-BACKEND).
 * Rotas e infra (`src/app/api`, `src/infrastructure`) importam por domínio, ex.:
 * `@/application/use-cases/report/generate-pathway-summary`.
 */
export { generatePathwaySummary } from "./report/generate-pathway-summary";
export type { GeneratePathwaySummaryInput } from "./report/generate-pathway-summary";
export { getDashboardHomeMetrics } from "./dashboard/get-dashboard-home-metrics";
export type {
  DashboardHomeMetrics,
  DashboardPathwayOption,
  GetDashboardHomeResult,
} from "./dashboard/get-dashboard-home-metrics";
export type { IDashboardHomeRepository } from "@/application/ports/dashboard-home-repository.port";
