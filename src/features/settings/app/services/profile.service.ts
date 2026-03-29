import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";

import type { MeUser } from "@/features/settings/types/account";

type GetMePayload = { user: MeUser };

type PatchMePayload = {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    globalRole: string;
    emailVerified: Date | null;
  };
};

export async function getMe(): Promise<MeUser> {
  try {
    const res = await apiClient.get<ApiEnvelope<GetMePayload>>("/api/v1/me");
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data.user;
  } catch (e) {
    throw normalizeApiError(e);
  }
}

export async function patchMe(body: { name?: string; image?: string | null }): Promise<PatchMePayload["user"]> {
  try {
    const res = await apiClient.patch<ApiEnvelope<PatchMePayload>>("/api/v1/me", body);
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data.user;
  } catch (e) {
    throw normalizeApiError(e);
  }
}

export async function changePassword(body: { currentPassword: string; newPassword: string }): Promise<void> {
  try {
    const res = await apiClient.post<ApiEnvelope<{ message: string }>>("/api/v1/me/password", body);
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
  } catch (e) {
    throw normalizeApiError(e);
  }
}

export async function deleteAccount(): Promise<void> {
  try {
    const res = await apiClient.delete<ApiEnvelope<{ message: string }>>("/api/v1/me", {
      skipErrorToast: true,
    });
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
  } catch (e) {
    throw normalizeApiError(e);
  }
}
