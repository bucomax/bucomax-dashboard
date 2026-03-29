import { z } from "zod";

export const notificationsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type NotificationsListQuery = z.infer<typeof notificationsListQuerySchema>;
