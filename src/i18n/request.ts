import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

async function loadMessages(locale: string) {
  switch (locale) {
    case "pt-BR":
      return {
        global: (await import("../../messages/pt-BR/global.json")).default,
        auth: (await import("../../messages/pt-BR/auth.json")).default,
        dashboard: (await import("../../messages/pt-BR/dashboard.json")).default,
        clients: (await import("../../messages/pt-BR/clients.json")).default,
      };
    case "en":
      return {
        global: (await import("../../messages/en/global.json")).default,
        auth: (await import("../../messages/en/auth.json")).default,
        dashboard: (await import("../../messages/en/dashboard.json")).default,
        clients: (await import("../../messages/en/clients.json")).default,
      };
    default:
      return {
        global: (await import("../../messages/pt-BR/global.json")).default,
        auth: (await import("../../messages/pt-BR/auth.json")).default,
        dashboard: (await import("../../messages/pt-BR/dashboard.json")).default,
        clients: (await import("../../messages/pt-BR/clients.json")).default,
      };
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "pt-BR" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
