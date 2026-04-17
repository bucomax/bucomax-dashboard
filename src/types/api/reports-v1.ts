import type { ApiPagination } from "@/lib/api/pagination";
import type { SlaHealthStatus } from "@/domain/pathway/sla-health";

export type ReportsSummaryQueryParams = {
  periodDays?: number;
  pathwayId?: string;
  opmeSupplierId?: string;
  page?: number;
  limit?: number;
};

export type ReportsKpisDto = {
  patientsInScope: number;
  criticalPatients: number;
  transitionsInPeriod: number;
  pathwaysInScope: number;
};

export type ReportsBreakdownRowDto = {
  id: string | null;
  label: string | null;
  count: number;
};

export type ReportsStatusBreakdownRowDto = {
  status: SlaHealthStatus;
  count: number;
};

export type ReportsCriticalPatientRowDto = {
  patientPathwayId: string;
  clientId: string;
  clientName: string;
  phone: string;
  pathwayName: string;
  stageName: string;
  daysInStage: number;
  status: SlaHealthStatus;
  opmeSupplierName: string | null;
};

export type ReportsSummaryResponseData = {
  generatedAt: string;
  filters: {
    periodDays: number;
    pathwayId: string | null;
    opmeSupplierId: string | null;
  };
  kpis: ReportsKpisDto;
  byStage: ReportsBreakdownRowDto[];
  byStatus: ReportsStatusBreakdownRowDto[];
  byPathway: ReportsBreakdownRowDto[];
  byOpme: ReportsBreakdownRowDto[];
  criticalPatients: {
    data: ReportsCriticalPatientRowDto[];
    pagination: ApiPagination;
  };
};
