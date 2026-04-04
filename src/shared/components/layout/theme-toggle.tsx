"use client";

import { Button } from "@/shared/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePersistedAppStore } from "@/shared/stores/use-persisted-app-store";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const setThemePreference = usePersistedAppStore((s) => s.setThemePreference);
  const isClient = useIsClient();
  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    setDomReady(true);
  }, []);

  if (!isClient || !domReady || theme === undefined) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label="Tema" disabled>
        <Sun className="size-4 opacity-0" />
      </Button>
    );
  }

  const isDark = theme === "system" ? resolvedTheme === "dark" : theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        setThemePreference(next);
      }}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
