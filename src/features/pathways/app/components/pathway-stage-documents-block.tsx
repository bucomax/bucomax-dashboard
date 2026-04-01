"use client";

import { uploadTenantLibraryFile } from "@/features/pathways/app/services/pathway-tenant-file-upload.service";
import { normalizeStageDocumentDraftItems } from "@/lib/pathway/graph";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FileText, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

type PathwayStageDocumentsBlockProps = {
  stageDocuments: unknown;
  onDocumentsAdded: (items: { fileAssetId: string; fileName: string; mimeType: string }[]) => void;
  onRemove: (fileAssetId: string) => void;
};

export function PathwayStageDocumentsBlock({
  stageDocuments,
  onDocumentsAdded,
  onRemove,
}: PathwayStageDocumentsBlockProps) {
  const t = useTranslations("pathways.editor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const docs = normalizeStageDocumentDraftItems(stageDocuments);

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setUploading(true);
      const added: { fileAssetId: string; fileName: string; mimeType: string }[] = [];
      try {
        for (const file of Array.from(list)) {
          const f = await uploadTenantLibraryFile(file);
          added.push({ fileAssetId: f.id, fileName: f.fileName, mimeType: f.mimeType });
        }
        if (added.length) {
          onDocumentsAdded(added);
          toast.success(t("stageDocumentsUploadSuccess", { count: added.length }));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("stageDocumentsUploadError"));
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onDocumentsAdded, t],
  );

  return (
    <div className="w-full min-w-0 space-y-3 border-t pt-3">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        accept="application/pdf,image/*,.pdf"
        onChange={(e) => void handleFiles(e.target.files)}
        disabled={uploading}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t("stageDocumentsTitle")}</p>
          <p className="text-muted-foreground text-xs">{t("stageDocumentsDescription")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {t("addStageDocument")}
        </Button>
      </div>

      {docs.length === 0 ? (
        <Alert variant="info">
          <Info aria-hidden />
          <AlertDescription className="text-current">{t("stageDocumentsEmpty")}</AlertDescription>
        </Alert>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.fileAssetId}
              className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
            >
              <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.fileName}</span>
              <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">{d.mimeType}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={uploading}
                onClick={() => onRemove(d.fileAssetId)}
                aria-label={t("removeStageDocumentAria")}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
