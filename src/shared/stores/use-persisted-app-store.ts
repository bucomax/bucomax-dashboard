import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createEncryptedPersistStorage } from "@/lib/storage/encrypted-persist-storage";
import type { ThemePreference } from "@/shared/types/persisted-app";

const PERSIST_NAME = "idoctor-app";

type PersistedAppState = {
  version: number;
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;
};

export const usePersistedAppStore = create<PersistedAppState>()(
  persist(
    (set) => ({
      version: 1,
      themePreference: "system",
      setThemePreference: (themePreference) => set({ themePreference }),
    }),
    {
      name: PERSIST_NAME,
      storage: createJSONStorage(() => createEncryptedPersistStorage()),
      partialize: (state) => ({
        version: state.version,
        themePreference: state.themePreference,
      }),
    },
  ),
);
