import { routing } from "@/i18n/routing";

export function normalizeCallbackPath(input: string | null, fallback: string): string {
  if (!input) {
    return fallback;
  }

  let path = input;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const parsed = new URL(path);
      path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return fallback;
    }
  }

  for (const locale of routing.locales) {
    const prefix = `/${locale}`;
    if (path === prefix) {
      return "/";
    }
    if (path.startsWith(`${prefix}/`)) {
      return path.slice(prefix.length) || "/";
    }
  }

  return path.startsWith("/") ? path : fallback;
}
