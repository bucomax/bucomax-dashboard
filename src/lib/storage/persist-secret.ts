const MIN_LENGTH = 32;

const DEV_FALLBACK = "idoctor-dev-persist-secret-do-not-use-in-prod!!";

/**
 * Segredo para AES (cliente). Em produção, defina `NEXT_PUBLIC_APP_PERSIST_SECRET`
 * com pelo menos 32 caracteres. Valor público no bundle — protege contra leitura casual
 * do localStorage, não contra um atacante com acesso ao JS.
 */
export function getPersistSecret(): string {
  const s = process.env.NEXT_PUBLIC_APP_PERSIST_SECRET?.trim();
  if (s && s.length >= MIN_LENGTH) {
    return s;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[idoctor] NEXT_PUBLIC_APP_PERSIST_SECRET ausente ou curta (mín. 32 caracteres) — usando chave de desenvolvimento.",
    );
    return DEV_FALLBACK;
  }
  throw new Error(
    "NEXT_PUBLIC_APP_PERSIST_SECRET é obrigatório em produção (mínimo 32 caracteres).",
  );
}
