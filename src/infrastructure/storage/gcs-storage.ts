import { randomUUID } from "crypto";
import { Storage } from "@google-cloud/storage";

type GcpServiceAccountJson = {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

let storageClient: Storage | null = null;

function parseServiceAccountJson(): GcpServiceAccountJson | null {
  const raw = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GcpServiceAccountJson;
  } catch {
    return null;
  }
}

function bucketNameOrThrow(): string {
  const name = process.env.GCS_BUCKET_NAME?.trim();
  if (!name) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }
  return name;
}

function getStorage(): Storage {
  if (storageClient) {
    return storageClient;
  }
  const sa = parseServiceAccountJson();
  if (sa?.client_email && sa.private_key) {
    const projectId =
      typeof sa.project_id === "string" && sa.project_id
        ? sa.project_id
        : process.env.GCS_PROJECT_ID?.trim();
    if (!projectId) {
      throw new Error("GCS: inclua project_id no JSON da service account ou defina GCS_PROJECT_ID.");
    }
    const privateKey = sa.private_key.replace(/\\n/g, "\n");
    storageClient = new Storage({
      projectId,
      credentials: {
        client_email: sa.client_email,
        private_key: privateKey,
      },
    });
  } else {
    const projectId = process.env.GCS_PROJECT_ID?.trim();
    storageClient = projectId ? new Storage({ projectId }) : new Storage();
  }
  return storageClient;
}

/** Bucket + credenciais mínimas para presign e deletes. */
export function isGcsConfigured(): boolean {
  if (!process.env.GCS_BUCKET_NAME?.trim()) {
    return false;
  }
  const sa = parseServiceAccountJson();
  if (sa) {
    const projectId =
      (typeof sa.project_id === "string" && sa.project_id) || process.env.GCS_PROJECT_ID?.trim();
    return Boolean(sa.client_email && sa.private_key && projectId);
  }
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
      process.env.GCLOUD_PROJECT?.trim() ||
      process.env.GCS_PROJECT_ID?.trim(),
  );
}

export function buildTenantUploadKey(tenantId: string, originalFileName: string): string {
  const safe = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
  return `tenants/${tenantId}/uploads/${randomUUID()}-${safe}`;
}

export function keyBelongsToTenant(key: string, tenantId: string): boolean {
  return key.startsWith(`tenants/${tenantId}/`);
}

export async function presignPutObject(key: string, mimeType: string): Promise<string> {
  const bucket = getStorage().bucket(bucketNameOrThrow());
  const file = bucket.file(key);
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 3600 * 1000,
    contentType: mimeType,
  });
  return url;
}

export async function presignGetObject(key: string, expiresInSeconds = 300): Promise<string> {
  const bucket = getStorage().bucket(bucketNameOrThrow());
  const file = bucket.file(key);
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresInSeconds * 1000,
  });
  return url;
}

export async function deleteObjectFromBucket(key: string): Promise<void> {
  const bucket = getStorage().bucket(bucketNameOrThrow());
  await bucket.file(key).delete();
}

/** URL pública estável (ex.: bucket público ou CDN); senão `null` — downloads usam presign. */
export function publicUrlForKey(key: string): string | null {
  const base = process.env.GCS_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/${key}`;
}
