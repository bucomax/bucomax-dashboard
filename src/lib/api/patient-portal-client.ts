import type {
  PatientPortalFilesListResponseData,
  PatientPortalFileRegisteredResponse,
  PatientPortalOverviewResponse,
  PatientPortalTimelineResponseData,
} from "@/types/api/patient-portal-v1";

/** Cookie do portal ausente ou expirado — UI deve orientar o paciente a usar o link mágico. */
export class PatientPortalUnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "PatientPortalUnauthorizedError";
  }
}

type SuccessEnvelope<T> = { success: true; data: T };
type ErrorEnvelope = { success: false; error: { message: string; code?: string } };

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Troca token do link mágico por cookie de sessão do portal (mesma origem). */
export async function exchangePatientPortalToken(token: string): Promise<void> {
  const res = await fetch("/api/v1/public/patient-portal/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  const body = (await parseJson(res)) as SuccessEnvelope<{ ok: boolean }> | ErrorEnvelope | null;
  if (!res.ok || !body || body.success !== true) {
    const msg =
      body && "error" in body && body.error?.message
        ? body.error.message
        : "Falha ao validar o link.";
    throw new Error(msg);
  }
}

export async function fetchPatientPortalOverview(): Promise<PatientPortalOverviewResponse> {
  const res = await fetch("/api/v1/patient/overview", { credentials: "include" });
  const body = (await parseJson(res)) as
    | SuccessEnvelope<PatientPortalOverviewResponse>
    | ErrorEnvelope
    | null;
  if (res.status === 401) {
    throw new PatientPortalUnauthorizedError();
  }
  if (!res.ok || !body || body.success !== true) {
    const msg =
      body && "error" in body && body.error?.message
        ? body.error.message
        : "Falha ao carregar o portal.";
    throw new Error(msg);
  }
  return body.data;
}

export async function logoutPatientPortal(): Promise<void> {
  await fetch("/api/v1/patient/logout", { method: "POST", credentials: "include" });
}

export async function fetchPatientPortalTimeline(
  page = 1,
  limit = 20,
): Promise<PatientPortalTimelineResponseData> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(`/api/v1/patient/timeline?${qs}`, { credentials: "include" });
  const body = (await parseJson(res)) as
    | SuccessEnvelope<PatientPortalTimelineResponseData>
    | ErrorEnvelope
    | null;
  if (res.status === 401) {
    throw new PatientPortalUnauthorizedError();
  }
  if (!res.ok || !body || body.success !== true) {
    const msg =
      body && "error" in body && body.error?.message
        ? body.error.message
        : "Falha ao carregar a linha do tempo.";
    throw new Error(msg);
  }
  return body.data;
}

export async function fetchPatientPortalFiles(
  page = 1,
  limit = 20,
): Promise<PatientPortalFilesListResponseData> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await fetch(`/api/v1/patient/files?${qs}`, { credentials: "include" });
  const body = (await parseJson(res)) as
    | SuccessEnvelope<PatientPortalFilesListResponseData>
    | ErrorEnvelope
    | null;
  if (res.status === 401) {
    throw new PatientPortalUnauthorizedError();
  }
  if (!res.ok || !body || body.success !== true) {
    const msg =
      body && "error" in body && body.error?.message
        ? body.error.message
        : "Falha ao carregar arquivos.";
    throw new Error(msg);
  }
  return body.data;
}

type PresignPutResponse = {
  key: string;
  uploadUrl: string;
  mimeType: string;
};

/**
 * Pré-assina, envia o blob ao storage e registra metadados (fila de validação na clínica).
 */
export async function uploadPatientPortalFile(file: File): Promise<PatientPortalFileRegisteredResponse> {
  const mimeType = file.type?.trim() || "application/octet-stream";
  const presignRes = await fetch("/api/v1/patient/files/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fileName: file.name, mimeType }),
  });
  const presignBody = (await parseJson(presignRes)) as SuccessEnvelope<PresignPutResponse> | ErrorEnvelope | null;
  if (presignRes.status === 401) {
    throw new PatientPortalUnauthorizedError();
  }
  if (!presignRes.ok || !presignBody || presignBody.success !== true) {
    const msg =
      presignBody && "error" in presignBody && presignBody.error?.message
        ? presignBody.error.message
        : "Falha ao preparar envio.";
    throw new Error(msg);
  }
  const { key, uploadUrl } = presignBody.data;
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": mimeType },
  });
  if (!putRes.ok) {
    throw new Error(`Upload falhou (${putRes.status})`);
  }
  const regRes = await fetch("/api/v1/patient/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      key,
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
    }),
  });
  const regBody = (await parseJson(regRes)) as
    | SuccessEnvelope<PatientPortalFileRegisteredResponse>
    | ErrorEnvelope
    | null;
  if (regRes.status === 401) {
    throw new PatientPortalUnauthorizedError();
  }
  if (!regRes.ok || !regBody || regBody.success !== true) {
    const msg =
      regBody && "error" in regBody && regBody.error?.message
        ? regBody.error.message
        : "Falha ao registrar arquivo.";
    throw new Error(msg);
  }
  return regBody.data;
}

export async function requestPatientPortalFileDownloadPresign(fileId: string): Promise<string> {
  const res = await fetch("/api/v1/patient/files/presign-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fileId }),
  });
  const body = (await parseJson(res)) as
    | SuccessEnvelope<{ downloadUrl: string }>
    | ErrorEnvelope
    | null;
  if (res.status === 401) {
    throw new PatientPortalUnauthorizedError();
  }
  if (!res.ok || !body || body.success !== true) {
    const msg =
      body && "error" in body && body.error?.message
        ? body.error.message
        : "Falha ao gerar link de download.";
    throw new Error(msg);
  }
  return body.data.downloadUrl;
}
