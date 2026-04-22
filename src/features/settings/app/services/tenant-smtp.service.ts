import { apiClient } from "@/lib/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api/v1";
import type {
  GetTenantSmtpResponse,
  PatchTenantSmtpResponse,
  PostTestTenantSmtpResponse,
} from "@/types/api/tenant-smtp-v1";
import type { PatchTenantSmtpBody } from "@/lib/validators/tenant-smtp";

export async function getTenantSmtpSettings(): Promise<GetTenantSmtpResponse> {
  const res = await apiClient.get<ApiEnvelope<GetTenantSmtpResponse>>("/api/v1/tenant/email-smtp", {
    skipErrorToast: true,
  });
  if (!res.data.success) {
    throw new Error(res.data.error.message);
  }
  return res.data.data;
}

export async function patchTenantSmtpSettings(body: PatchTenantSmtpBody): Promise<PatchTenantSmtpResponse> {
  const res = await apiClient.patch<ApiEnvelope<PatchTenantSmtpResponse>>("/api/v1/tenant/email-smtp", body);
  if (!res.data.success) {
    throw new Error(res.data.error.message);
  }
  return res.data.data;
}

export async function postTestTenantSmtp(body: { to?: string } = {}): Promise<PostTestTenantSmtpResponse> {
  const res = await apiClient.post<ApiEnvelope<PostTestTenantSmtpResponse>>(
    "/api/v1/tenant/email-smtp/test",
    body,
  );
  if (!res.data.success) {
    throw new Error(res.data.error.message);
  }
  return res.data.data;
}
