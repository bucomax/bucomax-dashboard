import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";
import type { AdminInviteInput, AdminInviteResult } from "@/features/settings/app/types/account";

export async function sendAdminInvite(input: AdminInviteInput): Promise<AdminInviteResult> {
  try {
    const res = await apiClient.post<ApiEnvelope<AdminInviteResult>>("/api/v1/admin/invites", input);
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  } catch (e) {
    throw normalizeApiError(e);
  }
}
