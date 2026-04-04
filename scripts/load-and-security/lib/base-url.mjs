/**
 * URL alvo dos testes. Use sempre ambiente isolado (staging/local), nunca produção sem acordo explícito.
 */
export function getBaseUrl() {
  const raw = process.env.LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000";
  return raw.replace(/\/$/, "");
}
