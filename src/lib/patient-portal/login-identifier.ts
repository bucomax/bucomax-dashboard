import { z } from "zod";
import { digitsOnlyCpf } from "@/lib/validators/cpf";

export type ParsedPortalLogin =
  | { kind: "cpf"; cpf11: string }
  | { kind: "email"; emailNorm: string };

const emailSchema = z.string().email();

/**
 * Interpreta o campo único de login do portal: CPF (11 dígitos) ou e-mail.
 * Retorna `null` se o formato for inválido.
 */
export function parsePortalLoginInput(raw: string): ParsedPortalLogin | null {
  const s = raw.trim();
  if (!s) return null;

  if (s.includes("@")) {
    const lower = s.toLowerCase();
    const emailParsed = emailSchema.safeParse(lower);
    if (!emailParsed.success) return null;
    return { kind: "email", emailNorm: emailParsed.data };
  }

  const cpf = digitsOnlyCpf(s);
  if (cpf.length !== 11) return null;
  return { kind: "cpf", cpf11: cpf };
}

/** Chave estável para rate limit / logs (sem expor PII completo em excesso). */
export function portalLoginRateKey(parsed: ParsedPortalLogin): string {
  return parsed.kind === "cpf" ? `cpf:${parsed.cpf11}` : `em:${parsed.emailNorm}`;
}
