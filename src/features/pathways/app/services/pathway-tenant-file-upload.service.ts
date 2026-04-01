import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";

type PresignResponseData = {
  key: string;
  uploadUrl: string;
  mimeType: string;
};

type RegisterFileDto = {
  id: string;
  fileName: string;
  mimeType: string;
};

/**
 * Upload para a biblioteca do tenant (sem `clientId`), para anexar a etapas da jornada.
 */
export async function uploadTenantLibraryFile(file: File): Promise<RegisterFileDto> {
  const mimeType = file.type?.trim() || "application/octet-stream";
  try {
    const presignRes = await apiClient.post<ApiEnvelope<PresignResponseData>>("/api/v1/files/presign", {
      fileName: file.name,
      mimeType,
    });
    if (!presignRes.data.success) {
      throw new Error(presignRes.data.error.message);
    }
    const { key, uploadUrl } = presignRes.data.data;

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": mimeType },
    });
    if (!putRes.ok) {
      throw new Error(`Upload falhou (${putRes.status})`);
    }

    const regRes = await apiClient.post<ApiEnvelope<{ file: RegisterFileDto }>>("/api/v1/files", {
      key,
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
    });
    if (!regRes.data.success) {
      throw new Error(regRes.data.error.message);
    }
    return regRes.data.data.file;
  } catch (e) {
    throw normalizeApiError(e);
  }
}
