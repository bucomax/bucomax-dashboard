"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { ThemePreferenceBridge } from "@/shared/components/providers/theme-preference-bridge";

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
      storageKey="bucomax-nt-theme"
    >
      <ThemePreferenceBridge />
      {children}
    </NextThemesProvider>
  );
}
