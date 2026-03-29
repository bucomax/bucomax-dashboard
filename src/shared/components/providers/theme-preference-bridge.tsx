"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePersistedAppStore } from "@/shared/stores/use-persisted-app-store";

/**
 * Após reidratar o Zustand, aplica `themePreference` no `next-themes`
 * (o pacote ainda usa uma chave própria no localStorage para FOUC; a preferência
 * canônica fica no bucket criptografado `app.persisted.v1`).
 */
export function ThemePreferenceBridge() {
  const themePreference = usePersistedAppStore((s) => s.themePreference);
  const { setTheme } = useTheme();
  const [hydrated, setHydrated] = useState(
    () => typeof window !== "undefined" && usePersistedAppStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = usePersistedAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setTheme(themePreference);
  }, [hydrated, themePreference, setTheme]);

  return null;
}
