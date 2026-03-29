"use client";

import { useCallback, useState } from "react";

import { requestFileDownloadPresign } from "@/features/clients/app/services/clients.service";

export function useClientFileDownload() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const openDownload = useCallback(async (fileId: string) => {
    setDownloadingId(fileId);
    try {
      const { downloadUrl } = await requestFileDownloadPresign({ fileId });
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return {
    downloadingId,
    openDownload,
  };
}
