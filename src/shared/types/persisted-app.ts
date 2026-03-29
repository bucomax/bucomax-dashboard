/** Preferência de tema persistida no bucket criptografado (fonte de verdade). */
export type ThemePreference = "light" | "dark" | "system";

/** `"system"` = navegador detecta; caso contrário pt-BR ou en fixo. */
export type LocalePreference = "system" | "pt-BR" | "en";

/** Forma serializada no `persist` do Zustand (sem actions). */
export type PersistedAppSlice = {
  version: number;
  themePreference: ThemePreference;
  localePreference: LocalePreference;
};
