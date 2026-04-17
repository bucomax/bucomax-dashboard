"use client";

import { ClipboardCheck, Info, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { normalizeStageChecklistDraftItems } from "@/domain/pathway/graph-normalizer";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";

type PathwayStageChecklistBlockProps = {
  checklistItems: unknown;
  onAdd: () => void;
  onUpdate: (itemId: string, label: string) => void;
  onUpdateRequired: (itemId: string, requiredForTransition: boolean) => void;
  onRemove: (itemId: string) => void;
  /** Quando o cartão da etapa já traz o separador (lista em Configurações). */
  noSectionBorder?: boolean;
};

export function PathwayStageChecklistBlock({
  checklistItems,
  onAdd,
  onUpdate,
  onUpdateRequired,
  onRemove,
  noSectionBorder = false,
}: PathwayStageChecklistBlockProps) {
  const t = useTranslations("pathways.columnEditor");
  const items = normalizeStageChecklistDraftItems(checklistItems);

  return (
    <div
      className={cn(
        "w-full min-w-0 space-y-4",
        noSectionBorder ? "pt-0" : "border-border/55 border-t pt-5",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t("checklistTitle")}</p>
          <p className="text-muted-foreground text-xs">{t("checklistDescription")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          {t("addChecklistItem")}
        </Button>
      </div>

      {items.length === 0 ? (
        <Alert variant="info">
          <Info aria-hidden />
          <AlertDescription className="text-current">{t("checklistEmpty")}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          <Alert variant="info">
            <Info aria-hidden />
            <AlertDescription className="text-current">{t("checklistRequiredForTransitionHint")}</AlertDescription>
          </Alert>
          {items.map((item, index) => (
            <div
              key={item.id}
              className="bg-card/35 flex items-start gap-3 rounded-lg border border-border/70 p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1 space-y-0">
                <label className="sr-only" htmlFor={`chk-label-${item.id}`}>
                  {t("checklistItemPlaceholder", { index: index + 1 })}
                </label>
                <Input
                  id={`chk-label-${item.id}`}
                  className="min-w-0"
                  value={item.label}
                  onChange={(e) => onUpdate(item.id, e.target.value)}
                  placeholder={t("checklistItemPlaceholder", { index: index + 1 })}
                />
                <div className="border-border/45 mt-4 border-t pt-4">
                  <div className="bg-muted/40 ring-border/45 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ring-1">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ClipboardCheck
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <FieldLabel
                        className="text-foreground cursor-pointer text-sm leading-snug font-medium"
                        htmlFor={`chk-req-${item.id}`}
                      >
                        {t("checklistRequiredForTransitionLabel")}
                      </FieldLabel>
                    </div>
                    <Switch
                      id={`chk-req-${item.id}`}
                      size="sm"
                      className="shrink-0"
                      checked={item.requiredForTransition === true}
                      onCheckedChange={(v) => onUpdateRequired(item.id, v)}
                    />
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="mt-0.5 shrink-0"
                onClick={() => onRemove(item.id)}
                aria-label={t("removeChecklistItemAria")}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
