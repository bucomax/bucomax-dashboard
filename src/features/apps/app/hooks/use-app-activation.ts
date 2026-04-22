"use client";

import { useCallback, useState } from "react";
import { notifyActiveAppsMenuInvalidated } from "@/features/apps/app/lib/invalidate-active-apps";
import { activateApp, deactivateApp } from "@/features/apps/app/services/apps.service";

export function useAppActivation(onSuccess?: () => void) {
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const activate = useCallback(
    async (appId: string, config?: Record<string, unknown>) => {
      setActivating(true);
      try {
        await activateApp(appId, config);
        notifyActiveAppsMenuInvalidated();
        onSuccess?.();
      } finally {
        setActivating(false);
      }
    },
    [onSuccess],
  );

  const deactivate = useCallback(
    async (appId: string) => {
      setDeactivating(true);
      try {
        await deactivateApp(appId);
        notifyActiveAppsMenuInvalidated();
        onSuccess?.();
      } finally {
        setDeactivating(false);
      }
    },
    [onSuccess],
  );

  return { activate, deactivate, activating, deactivating };
}
