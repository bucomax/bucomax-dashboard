export type SettingsSectionId =
  | "account"
  | "clinic"
  | "notifications"
  | "email"
  | "team"
  | "opme"
  | "phases"
  | "apps"
  | "admin";

const HASH_TO_SECTION: Record<string, SettingsSectionId> = {
  account: "account",
  clinic: "clinic",
  notifications: "notifications",
  email: "email",
  team: "team",
  opme: "opme",
  phases: "phases",
  apps: "apps",
  admin: "admin",
};

export function sectionFromHash(hash: string): SettingsSectionId | null {
  const key = hash.replace(/^#/, "");
  return HASH_TO_SECTION[key] ?? null;
}
