"use client";

import { Info, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { normalizeStageChecklistDraftItems } from "@/lib/pathway/graph";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type PathwayStageChecklistBlockProps = {
  checklistItems: unknown;
  onAdd: () => void;
  onUpdate: (itemId: string, label: string) => void;
  onRemove: (itemId: string) => void;
};

export function PathwayStageChecklistBlock({
  checklistItems,
  onAdd,
  onUpdate,
  onRemove,
}: PathwayStageChecklistBlockProps) {
  const t = useTranslations("pathways.columnEditor");
  const items = normalizeStageChecklistDraftItems(checklistItems);

  return (
    <div className="w-full space-y-3 border-t pt-3">
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
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.label}
                onChange={(e) => onUpdate(item.id, e.target.value)}
                placeholder={t("checklistItemPlaceholder", { index: index + 1 })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
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
