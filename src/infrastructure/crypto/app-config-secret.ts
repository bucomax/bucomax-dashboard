import { encryptTenantSecret, decryptTenantSecret } from "./tenant-secret";
import type { AppConfigField } from "@/types/api/apps-v1";

/**
 * Encrypts secret fields in a config object before persisting to TenantApp.configEncrypted.
 *
 * Fields with type "secret" in the configSchema are encrypted with AES-256-GCM.
 * Non-secret fields are stored as-is.
 */
export function encryptConfigSecrets(
  config: Record<string, unknown>,
  schema: AppConfigField[],
): Record<string, unknown> {
  const secretKeys = new Set(
    schema.filter((f) => f.type === "secret").map((f) => f.key),
  );

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (secretKeys.has(key) && typeof value === "string" && value.length > 0) {
      result[key] = `enc:${encryptTenantSecret(value)}`;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Decrypts secret fields from TenantApp.configEncrypted.
 *
 * Returns the full config with secret values decrypted.
 */
export function decryptConfigSecrets(
  config: Record<string, unknown>,
  schema: AppConfigField[],
): Record<string, unknown> {
  const secretKeys = new Set(
    schema.filter((f) => f.type === "secret").map((f) => f.key),
  );

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (
      secretKeys.has(key) &&
      typeof value === "string" &&
      value.startsWith("enc:")
    ) {
      try {
        result[key] = decryptTenantSecret(value.slice(4));
      } catch {
        result[key] = ""; // corrupted — return empty
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Masks secret fields for display (configSummary in the API response).
 *
 * Returns a Record<string, string> with secret values masked like "sk-****1234".
 */
export function maskConfigSecrets(
  config: Record<string, unknown>,
  schema: AppConfigField[],
): Record<string, string> {
  const secretKeys = new Set(
    schema.filter((f) => f.type === "secret").map((f) => f.key),
  );

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (secretKeys.has(key)) {
      // For encrypted values, show "••••••"
      result[key] = "••••••";
    } else {
      result[key] = String(value ?? "");
    }
  }
  return result;
}
