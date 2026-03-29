import { z } from "zod";

export const patchPatientChecklistItemBodySchema = z.object({
  completed: z.boolean(),
});
