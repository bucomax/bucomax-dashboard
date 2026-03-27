import { normalizeApiError } from "@/lib/api/axios-error";
import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";

type InvitePayload = { message: string; email: string };

export async function sendAdminInvite(input: {
  email: string;
  name?: string;
  tenantId: string;
  role: "tenant_admin" | "tenant_user";
}): Promise<InvitePayload> {
  try {
    const res = await apiClient.post<ApiEnvelope<InvitePayload>>("/api/v1/admin/invites", input);
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  } catch (e) {
    throw normalizeApiError(e);
  }
}
