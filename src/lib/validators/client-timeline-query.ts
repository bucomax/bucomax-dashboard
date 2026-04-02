import { z } from "zod";

/** Query de `GET /api/v1/clients/:id/timeline` (merge `AuditEvent` + `StageTransition` legado). */
export const clientTimelineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ClientTimelineQuery = z.infer<typeof clientTimelineQuerySchema>;
