import { cn } from "@/lib/utils/cn";

/** Estilo único para inputs e selects (dark mode). */
export const formFieldClassName = cn(
  "flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors",
  "placeholder:text-zinc-400",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-offset-zinc-950",
);

export const formLabelClassName = "text-sm font-medium leading-none text-zinc-900 dark:text-zinc-100";

export const formErrorClassName = "text-sm text-red-600 dark:text-red-400";

export const formDescriptionClassName = "text-xs text-zinc-500 dark:text-zinc-400";
