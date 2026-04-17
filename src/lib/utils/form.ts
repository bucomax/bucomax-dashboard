import type { FieldErrors } from "react-hook-form";

export function collectRhfErrorMessages(errors: FieldErrors): string[] {
  const out: string[] = [];

  function walk(node: unknown): void {
    if (node == null || typeof node !== "object") {
      return;
    }

    const candidate = node as Record<string, unknown>;
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      out.push(candidate.message);
      return;
    }

    for (const value of Object.values(candidate)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          walk(item);
        }
      } else if (value && typeof value === "object") {
        walk(value);
      }
    }
  }

  walk(errors);
  return [...new Set(out)];
}

export function scrollFirstInvalidFieldIntoView(): void {
  requestAnimationFrame(() => {
    const element =
      document.querySelector<HTMLElement>('[data-slot="field"][data-invalid]') ??
      document.querySelector<HTMLElement>('[aria-invalid="true"]');

    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
