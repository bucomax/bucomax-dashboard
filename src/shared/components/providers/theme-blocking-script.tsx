/**
 * Mesmo IIFE que o `next-themes` 0.4.6 injeta no DOM.
 * Usamos `<script dangerouslySetInnerHTML>` em Server Component (sem `next/script`):
 * o componente `Script` do Next hidrata no cliente e o React 19 emite aviso ao encontrar
 * `<script>` na árvore de reconciliação do cliente.
 *
 * Parâmetros alinhados a `ThemeProvider` em `[locale]/layout.tsx`: `attribute="class"`,
 * `storageKey="next-theme"`, `defaultTheme="system"`, etc.
 */
const THEME_INIT_IIFE = `(e,i,s,u,m,a,l,h)=>{let d=document.documentElement,w=["light","dark"];function p(n){(Array.isArray(e)?e:[e]).forEach(y=>{let k=y==="class",S=k&&a?m.map(f=>a[f]||f):m;k?(d.classList.remove(...S),d.classList.add(a&&a[n]?a[n]:n)):d.setAttribute(y,n)}),R(n)}function R(n){h&&w.includes(n)&&(d.style.colorScheme=n)}function c(){return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(u)p(u);else try{let n=localStorage.getItem(i)||s,y=l&&n==="system"?c():n;p(y)}catch(n){}}`;

const THEME_INIT_ARGS = `"class","next-theme","system",null,["light","dark"],null,true,true`;

export function ThemeBlockingScript() {
  return (
    <script
      id="next-themes-block"
      dangerouslySetInnerHTML={{
        __html: `(${THEME_INIT_IIFE})(${THEME_INIT_ARGS})`,
      }}
    />
  );
}
