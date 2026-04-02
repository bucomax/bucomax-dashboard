import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type PresignResponseData = {
  key: string;
  uploadUrl: string;
  mimeType: string;
  publicUrl: string | null;
};

export async function fetchProfileAvatarStorageAvailable(): Promise<boolean> {
  try {
    const res = await apiClient.get<ApiEnvelope<{ available: boolean }>>("/api/v1/files/storage-status");
    if (!res.data.success) {
      return false;
    }
    return res.data.data.available;
  } catch {
    return false;
  }
}

export type ProfileAvatarValidationErrorCode = "INVALID_TYPE" | "TOO_LARGE";

export class ProfileAvatarValidationError extends Error {
  constructor(
    public readonly code: ProfileAvatarValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProfileAvatarValidationError";
  }
}

export async function uploadProfileAvatarToStorage(file: File): Promise<string> {
  const mimeType = file.type?.trim() || "";
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
    throw new ProfileAvatarValidationError("INVALID_TYPE", "INVALID_TYPE");
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new ProfileAvatarValidationError("TOO_LARGE", "TOO_LARGE");
  }

  try {
    const presignRes = await apiClient.post<ApiEnvelope<PresignResponseData>>("/api/v1/files/presign", {
      fileName: file.name || "avatar.jpg",
      mimeType,
    });
    if (!presignRes.data.success) {
      throw new Error(presignRes.data.error.message);
    }
    const { uploadUrl, publicUrl } = presignRes.data.data;
    if (!publicUrl) {
      throw new Error("PUBLIC_URL_UNAVAILABLE");
    }

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": mimeType },
    });
    if (!putRes.ok) {
      throw new Error(`Upload failed (${putRes.status})`);
    }

    return publicUrl;
  } catch (e) {
    throw normalizeApiError(e);
  }
}
