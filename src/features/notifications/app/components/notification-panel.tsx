"use client";

import type { NotificationDto } from "@/features/notifications/types";
import { NotificationItem } from "./notification-item";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { BellOff, CheckCheck, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
  items: NotificationDto[];
  loading: boolean;
  hasMore: boolean;
  canMarkAllRead: boolean;
  markAllReadPending: boolean;
  onLoadMore: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void | Promise<void>;
};

export function NotificationPanel({
  open,
  onClose,
  items,
  loading,
  hasMore,
  canMarkAllRead,
  markAllReadPending,
  onLoadMore,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const t = useTranslations("notifications.bell");

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="gap-2 border-b px-4 py-3 pr-12">
          <SheetTitle className="text-base leading-tight">{t("title")}</SheetTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit self-start gap-1.5"
            disabled={!canMarkAllRead || markAllReadPending}
            onClick={() => void onMarkAllRead()}
          >
            {markAllReadPending ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5 shrink-0" />
            )}
            {t("markAllRead")}
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
              <div
                className="bg-muted/70 text-muted-foreground flex size-11 items-center justify-center rounded-full ring-1 ring-border/60"
                aria-hidden
              >
                <BellOff className="size-5 opacity-90" strokeWidth={1.75} />
              </div>
              <p className="text-muted-foreground max-w-[16rem] text-center text-sm leading-relaxed">
                {t("empty")}
              </p>
            </div>
          )}
          <div className="divide-y">
            {items.map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
            ))}
          </div>
          {loading && (
            <div className="flex justify-center p-4">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          {hasMore && !loading && (
            <div className="p-3 text-center">
              <Button variant="ghost" size="sm" onClick={onLoadMore}>
                {t("loadMore")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
