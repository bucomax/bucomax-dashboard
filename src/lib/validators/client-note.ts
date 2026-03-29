import { z } from "zod";

export const postClientNoteBodySchema = z.object({
  content: z.string().trim().min(1).max(10_000),
});
