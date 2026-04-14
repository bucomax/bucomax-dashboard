import { z } from "zod";

const trimmedSearch = z
  .string()
  .max(200)
  .optional()
  .transform((s) => {
    const t = s?.trim();
    return t && t.length > 0 ? t : undefined;
  });

const optionalId = z
  .string()
  .max(64)
  .optional()
  .transform((s) => s?.trim() || undefined);

export const clientsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
  q: trimmedSearch,
  pathwayId: optionalId,
  stageId: optionalId,
  status: z.enum(["ok", "warning", "danger", "completed"]).optional(),
  /** `1` ou `true`: ignora `unstable_cache` e lê o banco (p.ex. após excluir paciente). */
  fresh: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export type ClientsListQuery = z.infer<typeof clientsListQuerySchema>;
