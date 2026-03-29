import { postClientBodySchema, publicPatientSelfRegisterBodySchema } from "@/lib/validators/client";
import type { z } from "zod";

/** Formulário etapa 1 — alinhado ao `POST /api/v1/clients`. */
export const newClientFormSchema = postClientBodySchema;

/** Cadastro público (token vem da query, não do formulário). */
export const patientSelfRegisterFormSchema = publicPatientSelfRegisterBodySchema.omit({ token: true });

/** Valores do formulário (entrada RHF; saída validada = `CreateClientRequestBody`). */
export type NewClientFormValues = z.input<typeof newClientFormSchema>;

export type PatientSelfRegisterFormValues = z.input<typeof patientSelfRegisterFormSchema>;
