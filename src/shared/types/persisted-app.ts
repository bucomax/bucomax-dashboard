/** Preferência de tema persistida no bucket criptografado (fonte de verdade). */
export type ThemePreference = "light" | "dark" | "system";

/** Forma serializada no `persist` do Zustand (sem actions). */
export type PersistedAppSlice = {
  version: number;
  themePreference: ThemePreference;
};
