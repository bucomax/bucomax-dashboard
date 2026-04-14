import { z } from "zod";

const timelineCategory = z.enum([
  "security",
  "clinical",
  "documents",
  "administrative",
  "compliance",
]);

/** Query `GET /api/v1/clients/:id/audit-export` */
export const clientAuditExportQuerySchema = z.object({
  format: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["csv"]).default("csv"),
  ),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  categories: z
    .string()
    .optional()
    .transform((raw) => {
      if (raw == null || String(raw).trim() === "") return null;
      const parts = String(raw)
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      const uniq = [...new Set(parts)];
      if (uniq.length === 0) return null;
      return z.array(timelineCategory).min(1).parse(uniq);
    }),
});

export type ClientAuditExportQuery = z.infer<typeof clientAuditExportQuerySchema>;
