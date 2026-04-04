/** Fuso usado nos gráficos do dashboard (operação típica BR). */
export const DASHBOARD_CHART_TIMEZONE = "America/Sao_Paulo";

/**
 * Chave `YYYY-MM-DD` do instante em um fuso (para agrupar transições por dia de calendário).
 */
export function calendarDayKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Os últimos `n` dias de calendário no `timeZone`, do mais antigo ao mais recente
 * (último = dia de `anchor`). Brasil sem DST — passos de 24h.
 */
export function lastNCalendarDaysInTimeZone(anchor: Date, n: number, timeZone: string): string[] {
  const newestFirst: string[] = [];
  let t = anchor.getTime();
  for (let i = 0; i < n; i++) {
    newestFirst.push(calendarDayKeyInTimeZone(new Date(t), timeZone));
    t -= 86_400_000;
  }
  return newestFirst.reverse();
}

/**
 * Início do dia civil em São Paulo como `Date` (horário UTC).
 * Brasil permanece em UTC−3 (sem horário de verão) — meia-noite local = 03:00 UTC no mesmo Y-M-D.
 */
export function startOfSaoPauloCalendarDay(dayKeyYmd: string): Date {
  const [y, mo, da] = dayKeyYmd.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, da, 3, 0, 0, 0));
}

/**
 * Rótulo de data por extenso para um dia civil já representado por `YYYY-MM-DD` no `timeZone`.
 * Usa meio-dia UTC como âncora para evitar deslocamento ao formatar com fuso.
 */
export function formatCalendarDayLongLabel(dayKeyYmd: string, locale: string, timeZone: string): string {
  const [y, mo, da] = dayKeyYmd.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0));
  const intlLocale = locale === "en" ? "en-US" : "pt-BR";
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "long",
    timeZone,
  }).format(noonUtc);
}
