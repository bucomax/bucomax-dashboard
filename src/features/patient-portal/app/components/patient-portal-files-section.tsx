"use client";

import { usePatientPortalTenantSlug } from "@/features/patient-portal/app/context/patient-portal-tenant-context";
import {
  fetchPatientPortalFiles,
  requestPatientPortalFileDownloadPresign,
  uploadPatientPortalFile,
  PatientPortalUnauthorizedError,
} from "@/lib/api/patient-portal-client";
import { formatFileSize } from "@/lib/utils/format-bytes";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PatientPortalFilesListResponseData } from "@/types/api/patient-portal-v1";

type Props = {
  formatDateTime: (iso: string) => string;
  onAfterUpload?: () => void;
};

export function PatientPortalFilesSection({ formatDateTime, onAfterUpload }: Props) {
  const tenantSlug = usePatientPortalTenantSlug();
  const t = useTranslations("patientPortal");
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<PatientPortalFilesListResponseData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      setError(null);
      void fetchPatientPortalFiles(tenantSlug, p, limit)
        .then((d) => {
          setData(d);
          setPage(p);
        })
        .catch((e: unknown) => {
          if (e instanceof PatientPortalUnauthorizedError) {
            setError(null);
            return;
          }
          setError(t("files.loadError"));
        })
        .finally(() => setLoading(false));
    },
    [limit, t, tenantSlug],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPatientPortalFile(tenantSlug, file);
      onAfterUpload?.();
      load(page);
    } catch (err: unknown) {
      if (err instanceof PatientPortalUnauthorizedError) return;
      setError(err instanceof Error ? err.message : t("files.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function openDownload(fileId: string) {
    setDownloadId(fileId);
    try {
      const url = await requestPatientPortalFileDownloadPresign(tenantSlug, fileId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("files.downloadError"));
    } finally {
      setDownloadId(null);
    }
  }

  const pag = data?.pagination;
  const from = pag && pag.totalItems === 0 ? 0 : pag ? (page - 1) * limit + 1 : 0;
  const to = pag && pag.totalItems === 0 ? 0 : pag ? Math.min(page * limit, pag.totalItems) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("files.title")}</CardTitle>
        <CardDescription>{t("files.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => void onPickFile(e)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || loading}
            className="gap-1.5"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {t("files.chooseFile")}
          </Button>
          {uploading ? <span className="text-muted-foreground text-xs">{t("files.uploading")}</span> : null}
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        {loading && !data ? (
          <p className="text-muted-foreground text-sm">{t("home.loading")}</p>
        ) : null}

        {data && data.data.length === 0 && !loading ? (
          <p className="text-muted-foreground text-sm">{t("files.empty")}</p>
        ) : null}

        {data && data.data.length > 0 ? (
          <ul className="divide-border divide-y text-sm">
            {data.data.map((f) => {
              const pending = f.patientPortalReviewStatus === "PENDING";
              const canDownload =
                f.patientPortalReviewStatus === "NOT_APPLICABLE" ||
                f.patientPortalReviewStatus === "APPROVED";
              return (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.fileName}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatFileSize(f.sizeBytes)} · {f.mimeType} · {formatDateTime(f.createdAt)}
                    </p>
                    {pending ? (
                      <p className="text-amber-600 dark:text-amber-500 text-xs">{t("files.statusPending")}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={!canDownload || downloadId === f.id}
                      aria-label={t("files.download")}
                      onClick={() => void openDownload(f.id)}
                    >
                      {downloadId === f.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ExternalLink className="size-4" />
                      )}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {pag && pag.totalItems > 0 ? (
          <p className="text-muted-foreground text-xs">{t("files.range", { from, to, total: pag.totalItems })}</p>
        ) : null}

        {pag && pag.totalPages > 1 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || !pag.hasPreviousPage}
              onClick={() => load(page - 1)}
            >
              <ChevronLeft className="size-4" />
              {t("files.prev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || !pag.hasNextPage}
              onClick={() => load(page + 1)}
            >
              {t("files.next")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
