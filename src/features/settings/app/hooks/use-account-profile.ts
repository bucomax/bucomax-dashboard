"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { getMe, patchMe } from "@/features/settings/app/services/profile.service";
import type { MeUser } from "@/features/settings/app/types/account";

export function useAccountProfile() {
  const t = useTranslations("settings.profile");
  const [profile, setProfile] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      setProfile(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveProfile = useCallback(
    async (values: { name: string; image?: string | null }) => {
      const nextUser = await patchMe(values);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: nextUser.name,
              image: nextUser.image,
              imageUrl: nextUser.imageUrl,
              email: nextUser.email,
              globalRole: nextUser.globalRole,
              emailVerified: nextUser.emailVerified ?? null,
            }
          : prev,
      );
    },
    [],
  );

  return {
    profile,
    loading,
    error,
    reload,
    saveProfile,
  };
}
