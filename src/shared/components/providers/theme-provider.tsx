"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { ThemePreferenceBridge } from "@/shared/components/providers/theme-preference-bridge";
import { NEXT_THEME_LOCAL_STORAGE_KEY } from "@/shared/constants/next-theme-storage";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={NEXT_THEME_LOCAL_STORAGE_KEY}
    >
      <ThemePreferenceBridge />
      {children}
    </NextThemesProvider>
  );
}
