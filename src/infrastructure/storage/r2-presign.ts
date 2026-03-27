import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

function getS3(): S3Client {
  if (!isR2Configured()) {
    throw new Error("R2 não configurado.");
  }
  if (!s3Client) {
    const accountId = process.env.R2_ACCOUNT_ID!;
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export function buildTenantUploadKey(tenantId: string, originalFileName: string): string {
  const safe = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
  return `tenants/${tenantId}/uploads/${randomUUID()}-${safe}`;
}

export function keyBelongsToTenant(key: string, tenantId: string): boolean {
  return key.startsWith(`tenants/${tenantId}/`);
}

export async function presignPutObject(key: string, mimeType: string): Promise<string> {
  const s3 = getS3();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export function publicUrlForKey(key: string): string | null {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/${key}`;
}
