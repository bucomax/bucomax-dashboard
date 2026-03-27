import { postClientBodySchema } from "@/lib/validators/client";
import type { z } from "zod";

/** Formulário etapa 1 — alinhado ao `POST /api/v1/clients`. */
export const newClientFormSchema = postClientBodySchema;

export type NewClientFormValues = z.infer<typeof newClientFormSchema>;
