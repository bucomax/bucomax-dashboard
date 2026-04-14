import { z } from "zod";

const timelineCategory = z.enum([
  "security",
  "clinical",
  "documents",
  "administrative",
  "compliance",
]);

/** Query de `GET /api/v1/clients/:id/timeline` (merge `AuditEvent` + `StageTransition` legado). */
export const clientTimelineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Lista separada por vírgula: `security,clinical` — omitir = todas as categorias. */
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

export type ClientTimelineQuery = z.infer<typeof clientTimelineQuerySchema>;
