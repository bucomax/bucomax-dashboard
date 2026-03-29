import type { ZodError } from "zod";

/** Prefixo em `message` do Zod; rotas removem e chamam `apiT` do namespace `api`. */
export const ZOD_API_I18N_PREFIX = "@api/";

export function zodApiMsg(key: string): string {
  return `${ZOD_API_I18N_PREFIX}${key}`;
}

export function translateZodApiMessage(message: string, t: (key: string) => string): string {
  if (message.startsWith(ZOD_API_I18N_PREFIX)) {
    const path = message.slice(ZOD_API_I18N_PREFIX.length);
    return t(path);
  }
  return message;
}

/** Mensagens de `VALIDATION_ERROR` (API) a partir de um `ZodError`. */
export function joinTranslatedZodIssues(error: ZodError, t: (key: string) => string): string {
  return error.issues.map((issue) => translateZodApiMessage(issue.message, t)).join("; ");
}
