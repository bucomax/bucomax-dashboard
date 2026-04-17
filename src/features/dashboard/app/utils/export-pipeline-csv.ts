import type { KanbanColumn, PipelineStatusFilter } from "@/features/dashboard/app/types";

type ExportPipelineCsvInput = {
  columns: KanbanColumn[];
  pathwayName: string;
  search: string;
  statusFilter: PipelineStatusFilter;
  /** Rótulo do filtro OPME aplicado (nome do fornecedor ou “sem fornecedor”). */
  opmeFilterLabel: string;
};

function escapeCsvValue(value: string): string {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

export function buildPipelineCsv({
  columns,
  pathwayName,
  search,
  statusFilter,
  opmeFilterLabel,
}: ExportPipelineCsvInput): string {
  const header = [
    "pathway",
    "stage",
    "patient_name",
    "patient_phone",
    "sla_status",
    "entered_stage_at",
    "updated_at",
    "search_filter",
    "status_filter",
    "opme_filter",
  ];

  const rows = columns.flatMap((column) =>
    column.data.map((patientPathway) => [
      pathwayName,
      column.stage.name,
      patientPathway.client.name,
      patientPathway.client.phone,
      patientPathway.slaStatus,
      patientPathway.enteredStageAt,
      patientPathway.updatedAt,
      search.trim(),
      statusFilter || "all",
      opmeFilterLabel,
    ]),
  );

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(String(value ?? ""))).join(","))
    .join("\n");
}
