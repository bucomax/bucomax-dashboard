"use client";

import { routing } from "@/i18n/routing";
import { usePersistedAppStore } from "@/shared/stores/use-persisted-app-store";
import type { LocalePreference } from "@/shared/types/persisted-app";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const COOKIE_NAME = "NEXT_LOCALE";

function resolveLocale(pref: LocalePreference): string {
  if (pref !== "system") return pref;
  if (typeof navigator === "undefined") return routing.defaultLocale;
  const browserLang = navigator.language;
  const match = routing.locales.find((l) => browserLang.startsWith(l.split("-")[0]));
  return match ?? routing.defaultLocale;
}

function setCookie(locale: string) {
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

/**
 * Sincroniza `localePreference` (Zustand) → cookie `NEXT_LOCALE`.
 * Quando o cookie muda, chama `router.refresh()` para o RSC recarregar as messages.
 */
export function LocalePreferenceBridge() {
  const localePreference = usePersistedAppStore((s) => s.localePreference);
  const router = useRouter();

  const [hydrated, setHydrated] = useState(
    () => typeof window !== "undefined" && usePersistedAppStore.persist.hasHydrated(),
  );
  const prevLocaleRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = usePersistedAppStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const resolved = resolveLocale(localePreference);
    setCookie(resolved);
    if (prevLocaleRef.current !== null && prevLocaleRef.current !== resolved) {
      router.refresh();
    }
    prevLocaleRef.current = resolved;
  }, [hydrated, localePreference, router]);

  return null;
}
