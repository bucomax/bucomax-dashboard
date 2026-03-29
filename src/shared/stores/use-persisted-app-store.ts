import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createEncryptedPersistStorage } from "@/lib/storage/encrypted-persist-storage";
import type { LocalePreference, ThemePreference } from "@/shared/types/persisted-app";

const PERSIST_NAME = "app.persisted.v1";

type PersistedAppState = {
  version: number;
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;
  localePreference: LocalePreference;
  setLocalePreference: (locale: LocalePreference) => void;
};

export const usePersistedAppStore = create<PersistedAppState>()(
  persist(
    (set) => ({
      version: 1,
      themePreference: "system",
      setThemePreference: (themePreference) => set({ themePreference }),
      localePreference: "system",
      setLocalePreference: (localePreference) => set({ localePreference }),
    }),
    {
      name: PERSIST_NAME,
      storage: createJSONStorage(() => createEncryptedPersistStorage()),
      partialize: (state) => ({
        version: state.version,
        themePreference: state.themePreference,
        localePreference: state.localePreference,
      }),
    },
  ),
);
