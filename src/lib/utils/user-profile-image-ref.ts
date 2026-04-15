/** Prefixo persistido em `User.image` quando a foto está no GCS (sem depender de URL pública estável). */
export const USER_PROFILE_IMAGE_GCS_PREFIX = "gcs:" as const;

export function formatUserProfileImageGcsRef(objectKey: string): string {
  return `${USER_PROFILE_IMAGE_GCS_PREFIX}${objectKey}`;
}

export function parseUserProfileImageGcsKey(image: string | null | undefined): string | null {
  if (!image?.startsWith(USER_PROFILE_IMAGE_GCS_PREFIX)) return null;
  const key = image.slice(USER_PROFILE_IMAGE_GCS_PREFIX.length).trim();
  return key.length > 0 ? key : null;
}
