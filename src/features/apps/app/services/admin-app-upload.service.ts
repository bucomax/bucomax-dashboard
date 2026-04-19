import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";
import { putFileWithUploadProgress } from "@/lib/utils/upload-put-xhr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PresignResponse = {
  key: string;
  uploadUrl: string;
  mimeType: string;
  publicUrl: string | null;
};

type IconRegisterResponse = {
  fileId: string;
  publicUrl: string | null;
};

type ScreenshotRegisterResponse = {
  screenshot: {
    id: string;
    fileId: string;
    imageUrl: string | null;
    caption: Record<string, string> | null;
    sortOrder: number;
  };
};

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

/** Full flow: presign → PUT → register icon for app. */
export async function uploadAppIcon(
  appId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<IconRegisterResponse> {
  // 1. Presign
  onProgress?.(5);
  const presignRes = await apiClient.post<ApiEnvelope<PresignResponse>>(
    `/api/v1/admin/apps/${appId}/icon`,
    { fileName: file.name, mimeType: file.type },
  );
  if (!presignRes.data.success) throw new Error("Presign falhou.");
  const { key, uploadUrl, mimeType } = presignRes.data.data;

  // 2. PUT to GCS
  await putFileWithUploadProgress(uploadUrl, file, mimeType, (raw) => {
    onProgress?.(5 + Math.round(raw * 0.8));
  });

  // 3. Register
  onProgress?.(90);
  const registerRes = await apiClient.post<ApiEnvelope<IconRegisterResponse>>(
    `/api/v1/admin/apps/${appId}/icon`,
    { key, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    { toastSuccessMessage: "Ícone salvo." },
  );
  if (!registerRes.data.success) throw new Error("Registro falhou.");

  onProgress?.(100);
  return registerRes.data.data;
}

/** Remove icon from app. */
export async function removeAppIcon(appId: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/apps/${appId}/icon`);
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

/** Full flow: presign → PUT → register screenshot for app. */
export async function uploadAppScreenshot(
  appId: string,
  file: File,
  caption?: Record<string, string>,
  onProgress?: (pct: number) => void,
): Promise<ScreenshotRegisterResponse> {
  // 1. Presign
  onProgress?.(5);
  const presignRes = await apiClient.post<ApiEnvelope<PresignResponse>>(
    `/api/v1/admin/apps/${appId}/screenshots`,
    { fileName: file.name, mimeType: file.type },
  );
  if (!presignRes.data.success) throw new Error("Presign falhou.");
  const { key, uploadUrl, mimeType } = presignRes.data.data;

  // 2. PUT to GCS
  await putFileWithUploadProgress(uploadUrl, file, mimeType, (raw) => {
    onProgress?.(5 + Math.round(raw * 0.8));
  });

  // 3. Register
  onProgress?.(90);
  const registerRes = await apiClient.post<ApiEnvelope<ScreenshotRegisterResponse>>(
    `/api/v1/admin/apps/${appId}/screenshots`,
    { key, fileName: file.name, mimeType: file.type, sizeBytes: file.size, caption },
    { toastSuccessMessage: "Screenshot adicionado." },
  );
  if (!registerRes.data.success) throw new Error("Registro falhou.");

  onProgress?.(100);
  return registerRes.data.data;
}

/** Delete a screenshot. */
export async function removeAppScreenshot(appId: string, screenshotId: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/apps/${appId}/screenshots`, {
    data: { screenshotId },
  });
}

/** Reorder screenshots. */
export async function reorderAppScreenshots(appId: string, order: string[]): Promise<void> {
  await apiClient.post(`/api/v1/admin/apps/${appId}/screenshots`, { order });
}
