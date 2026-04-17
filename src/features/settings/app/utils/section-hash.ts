export type SettingsSectionId =
  | "account"
  | "clinic"
  | "notifications"
  | "whatsapp"
  | "team"
  | "opme"
  | "phases"
  | "admin";

const HASH_TO_SECTION: Record<string, SettingsSectionId> = {
  account: "account",
  clinic: "clinic",
  notifications: "notifications",
  whatsapp: "whatsapp",
  team: "team",
  opme: "opme",
  phases: "phases",
  admin: "admin",
};

export function sectionFromHash(hash: string): SettingsSectionId | null {
  const key = hash.replace(/^#/, "");
  return HASH_TO_SECTION[key] ?? null;
}
