import {
  patientSelfRegisterFormSchema,
  postClientBodySchema,
} from "@/lib/validators/client";
import type { z } from "zod";

/** Formulário etapa 1 — alinhado ao `POST /api/v1/clients`. */
export const newClientFormSchema = postClientBodySchema;

/** Cadastro público (token vem da query, não do formulário). */
export { patientSelfRegisterFormSchema };

/** Valores do formulário (entrada RHF; saída validada = `CreateClientRequestBody`). */
export type NewClientFormValues = z.input<typeof newClientFormSchema>;

export type PatientSelfRegisterFormValues = z.input<typeof patientSelfRegisterFormSchema>;
