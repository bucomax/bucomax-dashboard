"use client";

import { requestFileDownloadPresign } from "@/features/clients/app/services/clients.service";
import { uploadTenantLibraryFile } from "@/features/pathways/app/services/pathway-tenant-file-upload.service";
import { normalizeStageDocumentDraftItems } from "@/lib/pathway/graph";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { ExternalLink, FileText, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

type PathwayStageDocumentsBlockProps = {
  stageDocuments: unknown;
  onDocumentsAdded: (items: { fileAssetId: string; fileName: string; mimeType: string }[]) => void;
  onRemove: (fileAssetId: string) => void;
};

type PendingRow = {
  tempId: string;
  fileName: string;
  progress: number;
};

export function PathwayStageDocumentsBlock({
  stageDocuments,
  onDocumentsAdded,
  onRemove,
}: PathwayStageDocumentsBlockProps) {
  const t = useTranslations("pathways.editor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const docs = normalizeStageDocumentDraftItems(stageDocuments);

  const anyUploading = pendingRows.length > 0;

  const updatePendingProgress = useCallback((tempId: string, progress: number) => {
    setPendingRows((rows) =>
      rows.map((r) => (r.tempId === tempId ? { ...r, progress } : r)),
    );
  }, []);

  const handleOpenFile = useCallback(
    async (fileAssetId: string) => {
      setOpeningId(fileAssetId);
      try {
        const { downloadUrl } = await requestFileDownloadPresign({ fileId: fileAssetId });
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("stageDocumentsOpenError"));
      } finally {
        setOpeningId(null);
      }
    },
    [t],
  );

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      const files = Array.from(list);
      const queued = files.map((file) => ({
        tempId: crypto.randomUUID(),
        file,
        fileName: file.name,
      }));

      setPendingRows((rows) => [
        ...rows,
        ...queued.map((q) => ({ tempId: q.tempId, fileName: q.fileName, progress: 0 })),
      ]);

      let successCount = 0;

      await Promise.all(
        queued.map(async ({ tempId, file }) => {
          try {
            const f = await uploadTenantLibraryFile(file, (pct) => updatePendingProgress(tempId, pct));
            onDocumentsAdded([{ fileAssetId: f.id, fileName: f.fileName, mimeType: f.mimeType }]);
            successCount += 1;
            setPendingRows((rows) => rows.filter((r) => r.tempId !== tempId));
          } catch (e) {
            setPendingRows((rows) => rows.filter((r) => r.tempId !== tempId));
            toast.error(e instanceof Error ? e.message : t("stageDocumentsUploadError"));
          }
        }),
      );

      if (successCount > 0) {
        toast.success(t("stageDocumentsUploadSuccess", { count: successCount }));
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [onDocumentsAdded, t, updatePendingProgress],
  );

  return (
    <div className="border-border/55 w-full min-w-0 space-y-5 border-t pt-6">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple
        accept="application/pdf,image/*,.pdf"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-foreground text-sm font-semibold tracking-tight">{t("stageDocumentsTitle")}</p>
          <p className="text-muted-foreground max-w-prose text-xs leading-relaxed">{t("stageDocumentsDescription")}</p>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="shrink-0 gap-2 shadow-sm"
          onClick={() => inputRef.current?.click()}
        >
          {anyUploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          {t("addStageDocument")}
        </Button>
      </div>

      {docs.length === 0 && pendingRows.length === 0 ? (
        <Alert variant="info" className="border-border/60 bg-muted/25">
          <Info className="size-4" aria-hidden />
          <AlertDescription className="text-muted-foreground text-sm">{t("stageDocumentsEmpty")}</AlertDescription>
        </Alert>
      ) : (
        <ul className="space-y-2.5">
          {pendingRows.map((row) => (
            <li
              key={row.tempId}
              className="border-primary/25 from-primary/[0.06] shadow-primary/5 overflow-hidden rounded-xl border bg-gradient-to-br to-transparent p-4 shadow-sm ring-1 ring-primary/10"
            >
              <div className="flex items-start gap-3">
                <div className="bg-primary/15 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-3 pt-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{row.fileName}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{t("uploadingStageDocument")}</p>
                  </div>
                  <div className="bg-muted/80 h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="from-primary h-full rounded-full bg-gradient-to-r to-primary/75 transition-[width] duration-200 ease-out"
                      style={{ width: `${Math.max(row.progress, 4)}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
          {docs.map((d) => (
            <li
              key={d.fileAssetId}
              className={cn(
                "group flex min-w-0 items-center gap-3 rounded-xl border border-border/80 bg-card/60 px-3 py-2.5 shadow-sm backdrop-blur-sm transition-all",
                "hover:border-primary/30 hover:bg-muted/35",
              )}
            >
              <div className="bg-muted/60 text-muted-foreground group-hover:text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors">
                <FileText className="size-[1.15rem]" aria-hidden />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium leading-snug">{d.fileName}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={openingId === d.fileAssetId}
                  onClick={() => void handleOpenFile(d.fileAssetId)}
                  aria-label={t("openStageDocumentAria")}
                >
                  {openingId === d.fileAssetId ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <ExternalLink className="size-4" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/12 hover:text-destructive h-8 w-8 shrink-0"
                  onClick={() => onRemove(d.fileAssetId)}
                  aria-label={t("removeStageDocumentAria")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
