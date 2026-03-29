import type { ReportsSummaryResponseData } from "@/features/dashboard/types/api";

function escapeCsv(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  if (/[",\n;]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function buildReportsCsv(report: ReportsSummaryResponseData) {
  const lines: string[] = [];

  lines.push("section,key,value");
  lines.push(`filters,periodDays,${escapeCsv(report.filters.periodDays)}`);
  lines.push(`filters,pathwayId,${escapeCsv(report.filters.pathwayId)}`);
  lines.push(`filters,opmeSupplierId,${escapeCsv(report.filters.opmeSupplierId)}`);
  lines.push(`filters,generatedAt,${escapeCsv(report.generatedAt)}`);
  lines.push(`kpis,patientsInScope,${escapeCsv(report.kpis.patientsInScope)}`);
  lines.push(`kpis,criticalPatients,${escapeCsv(report.kpis.criticalPatients)}`);
  lines.push(`kpis,transitionsInPeriod,${escapeCsv(report.kpis.transitionsInPeriod)}`);
  lines.push(`kpis,pathwaysInScope,${escapeCsv(report.kpis.pathwaysInScope)}`);

  lines.push("");
  lines.push("by_status,status,count");
  for (const row of report.byStatus) {
    lines.push(`${escapeCsv(row.status)},${escapeCsv(row.count)}`);
  }

  lines.push("");
  lines.push("by_stage,id,label,count");
  for (const row of report.byStage) {
    lines.push(`${escapeCsv(row.id)},${escapeCsv(row.label)},${escapeCsv(row.count)}`);
  }

  lines.push("");
  lines.push("by_pathway,id,label,count");
  for (const row of report.byPathway) {
    lines.push(`${escapeCsv(row.id)},${escapeCsv(row.label)},${escapeCsv(row.count)}`);
  }

  lines.push("");
  lines.push("by_opme,id,label,count");
  for (const row of report.byOpme) {
    lines.push(`${escapeCsv(row.id)},${escapeCsv(row.label)},${escapeCsv(row.count)}`);
  }

  lines.push("");
  lines.push("clientId,clientName,phone,pathwayName,stageName,daysInStage,status,opmeSupplierName");
  for (const row of report.criticalPatients.data) {
    lines.push(
      [
        escapeCsv(row.clientId),
        escapeCsv(row.clientName),
        escapeCsv(row.phone),
        escapeCsv(row.pathwayName),
        escapeCsv(row.stageName),
        escapeCsv(row.daysInStage),
        escapeCsv(row.status),
        escapeCsv(row.opmeSupplierName),
      ].join(","),
    );
  }

  return lines.join("\n");
}
