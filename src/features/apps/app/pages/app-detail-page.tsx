"use client";

import { AppDetailView } from "@/features/apps/app/components/app-detail-view";

type Props = {
  appSlug: string;
};

export function AppDetailPage({ appSlug }: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <AppDetailView appId={appSlug} />
    </div>
  );
}
