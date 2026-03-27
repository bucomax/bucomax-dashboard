/**
 * Contrato padrão das respostas JSON da API (`/api/v1/*` e rotas internas alinhadas).
 *
 * Sucesso: `{ success: true, data, meta }`
 * Erro: `{ success: false, error, meta }`
 */

export type ApiMeta = {
  /** ISO 8601 (UTC) */
  timestamp: string;
};

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  /** Ex.: erros de validação (Zod), campos, etc. */
  details?: unknown;
};

export type ApiErrorEnvelope = {
  success: false;
  error: ApiErrorBody;
  meta: ApiMeta;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function createApiMeta(): ApiMeta {
  return { timestamp: new Date().toISOString() };
}
