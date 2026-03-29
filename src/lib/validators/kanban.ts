import { KANBAN_OPME_QUERY_UNASSIGNED } from "@/lib/pathway/kanban-client-where";
import { z } from "zod";

const trimmedSearch = z
  .string()
  .optional()
  .transform((s) => (typeof s === "string" ? s.trim() : ""));

const opmeSupplierIdQuery = z
  .string()
  .max(191)
  .optional()
  .transform((s) => {
    if (typeof s !== "string") return undefined;
    const t = s.trim();
    if (!t) return undefined;
    if (t === KANBAN_OPME_QUERY_UNASSIGNED) return KANBAN_OPME_QUERY_UNASSIGNED;
    return t;
  });

export const kanbanQuerySchema = z.object({
  search: trimmedSearch,
  status: z.enum(["ok", "warning", "danger"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  opmeSupplierId: opmeSupplierIdQuery,
});

export type KanbanQuery = z.infer<typeof kanbanQuerySchema>;

export const kanbanColumnPatientsQuerySchema = z.object({
  search: trimmedSearch,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  opmeSupplierId: opmeSupplierIdQuery,
});

export type KanbanColumnPatientsQuery = z.infer<typeof kanbanColumnPatientsQuerySchema>;

/** Filtro opcional por OPME do cliente (mesmo contrato do Kanban) em métricas e alertas. */
export const dashboardPathwayOpmeQuerySchema = z.object({
  opmeSupplierId: opmeSupplierIdQuery,
});

export type DashboardPathwayOpmeQuery = z.infer<typeof dashboardPathwayOpmeQuerySchema>;
