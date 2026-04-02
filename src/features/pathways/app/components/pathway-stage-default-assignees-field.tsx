"use client";

import { PATHWAY_STAGE_NONE_ASSIGNEE } from "@/features/pathways/app/constants/stage-default-assignee";
import type { LabeledSelectOption } from "@/shared/components/forms/labeled-select";
import { normalizeSearchText } from "@/lib/utils/string-search";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PathwayStageDefaultAssigneesFieldProps = {
  idPrefix: string;
  /** Cuids em ordem. */
  selectedUserIds: string[];
  /** Inclui opção `PATHWAY_STAGE_NONE_ASSIGNEE` para lista “vazia” no pai; aqui filtramos. */
  memberOptions: LabeledSelectOption[];
  onChange: (userIds: string[]) => void;
  /** Traduções: `pathways.editor` ou `pathways.columnEditor` via reuse de keys em `pathways.editor`. */
  label: string;
};

export function PathwayStageDefaultAssigneesField({
  idPrefix,
  selectedUserIds,
  memberOptions,
  onChange,
  label,
}: PathwayStageDefaultAssigneesFieldProps) {
  const t = useTranslations("pathways.editor");
  const pickable = memberOptions.filter(
    (o) => o.value !== PATHWAY_STAGE_NONE_ASSIGNEE && !selectedUserIds.includes(o.value),
  );

  const labelById = new Map(memberOptions.map((o) => [o.value, o.label]));

  const inputId = `${idPrefix}-assignees-search`;
  const listboxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const normalizedQuery = normalizeSearchText(query);
  const filteredPickable = useMemo(() => {
    if (!normalizedQuery) return pickable;
    return pickable.filter((o) => normalizeSearchText(o.label).includes(normalizedQuery));
  }, [pickable, normalizedQuery]);

  function remove(id: string) {
    onChange(selectedUserIds.filter((x) => x !== id));
  }

  function add(userId: string) {
    if (!userId || selectedUserIds.includes(userId)) return;
    onChange([...selectedUserIds, userId]);
    setQuery("");
    setListOpen(false);
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = wrapRef.current;
      if (!el?.contains(e.target as Node)) {
        setListOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <FieldDescription>{t("defaultAssigneesDescription")}</FieldDescription>
      {selectedUserIds.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {selectedUserIds.map((id) => (
            <li
              key={id}
              className={cn(
                "bg-muted/50 border-border inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-sm",
              )}
            >
              <span className="min-w-0 truncate">{labelById.get(id) ?? id}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/15 hover:text-destructive size-6 shrink-0"
                aria-label={t("defaultAssigneeRemoveAria")}
                onClick={() => remove(id)}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">{t("defaultAssigneesEmpty")}</p>
      )}
      {pickable.length > 0 ? (
        <div ref={wrapRef} className={cn("relative mt-2 w-full min-w-0 sm:max-w-md")}>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id={inputId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setListOpen(true);
            }}
            onFocus={() => setListOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setListOpen(false);
            }}
            placeholder={t("defaultAssigneesAddPlaceholder")}
            className="h-7 pl-8 text-[0.8rem] md:text-sm"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
          {listOpen ? (
            <div
              id={listboxId}
              role="listbox"
              className={cn(
                "bg-popover text-popover-foreground ring-foreground/10 absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg py-1 shadow-md ring-1",
              )}
            >
              {filteredPickable.length > 0 ? (
                <ul className="p-1">
                  {filteredPickable.map((o) => (
                    <li key={o.value} role="none">
                      <button
                        type="button"
                        role="option"
                        className={cn(
                          "hover:bg-muted focus:bg-muted w-full rounded-md px-2.5 py-1.5 text-left text-sm outline-none",
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          add(o.value);
                        }}
                      >
                        {o.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground px-3 py-2 text-xs">{t("defaultAssigneesSearchNoResults")}</p>
              )}
            </div>
          ) : null}
        </div>
      ) : selectedUserIds.length === 0 ? null : (
        <p className="text-muted-foreground mt-2 text-xs">{t("defaultAssigneesAllAdded")}</p>
      )}
    </Field>
  );
}
