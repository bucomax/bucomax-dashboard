import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export type ApiLocale = (typeof routing.locales)[number];

/**
 * Locale da API: `Accept-Language` (primeiro idioma) ou padrão do app.
 * Rotas `/api/*` ficam fora do proxy i18n; o cliente pode negociar idioma via header.
 */
export function resolveApiLocale(request: Request | undefined): ApiLocale {
  const header = request?.headers.get("accept-language");
  if (!header) return routing.defaultLocale;
  const first = header.split(",")[0]?.trim().split(";")[0]?.trim().toLowerCase();
  if (!first) return routing.defaultLocale;
  if (first.startsWith("en")) return "en";
  if (first.startsWith("pt")) return "pt-BR";
  return routing.defaultLocale;
}

async function loadApiTranslations(request?: Request) {
  const locale = resolveApiLocale(request);
  return getTranslations({ locale, namespace: "api" });
}

export type ApiT = Awaited<ReturnType<typeof loadApiTranslations>>;

/** Tradutor do namespace `api` (mensagens de erro/sucesso HTTP v1). */
export async function getApiT(request?: Request): Promise<ApiT> {
  return loadApiTranslations(request);
}
