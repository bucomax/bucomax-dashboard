import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";
import type {
  ReportsSummaryQueryParams,
  ReportsSummaryResponseData,
} from "@/features/dashboard/app/types/api";

export async function getReportsSummary(
  params: ReportsSummaryQueryParams,
): Promise<ReportsSummaryResponseData> {
  try {
    const res = await apiClient.get<ApiEnvelope<ReportsSummaryResponseData>>("/api/v1/reports/summary", {
      params: {
        periodDays: params.periodDays,
        pathwayId: params.pathwayId || undefined,
        opmeSupplierId: params.opmeSupplierId || undefined,
        page: params.page,
        limit: params.limit,
      },
    });
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  } catch (e) {
    throw normalizeApiError(e);
  }
}
