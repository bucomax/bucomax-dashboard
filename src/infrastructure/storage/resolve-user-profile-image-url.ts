import {
  isGcsConfigured,
  presignGetObject,
  publicUrlForKey,
} from "@/infrastructure/storage/gcs-storage";
import { parseUserProfileImageGcsKey } from "@/lib/utils/user-profile-image-ref";

/**
 * Expõe URL utilizável em `<img src>`: CDN/base pública se configurada; senão presign GET (TTL curto).
 * Somente servidor / rotas API — não importar em Client Components.
 */
export async function resolveUserProfileImageUrl(
  image: string | null | undefined,
): Promise<string | null> {
  if (image == null || image === "") return null;
  const key = parseUserProfileImageGcsKey(image);
  if (!key) return image;

  const direct = publicUrlForKey(key);
  if (direct) return direct;

  if (!isGcsConfigured()) return null;
  return presignGetObject(key, 3600);
}
