import { z } from "zod";

/**
 * Query de `GET /api/v1/clients/:id`.
 * `page` / `limit` aplicam-se à sublista **transitions** (histórico de mudanças de etapa).
 */
export const clientDetailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ClientDetailQuery = z.infer<typeof clientDetailQuerySchema>;
