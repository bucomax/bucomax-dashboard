/**
 * Tema antes da hidratação (anti-FOUC), alinhado ao `next-themes` no `ThemeProvider`.
 * Script em arquivo estático + `next/script` com `src` para evitar aviso do React 19 com
 * `<script dangerouslySetInnerHTML>` na árvore de componentes.
 */
import Script from "next/script";

export function ThemeBlockingScript() {
  return (
    <Script id="next-themes-block" strategy="beforeInteractive" src="/theme-hydration.js" />
  );
}
