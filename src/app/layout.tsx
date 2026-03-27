import type { ReactNode } from "react";

/**
 * Layout raiz mínimo: html/body ficam em `[locale]/layout.tsx` (next-intl + lang dinâmico).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
