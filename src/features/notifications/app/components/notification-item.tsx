"use client";

import type { NotificationDto } from "@/features/notifications/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

const TYPE_ICONS: Record<string, typeof Bell> = {
  sla_critical: AlertTriangle,
  sla_warning: AlertTriangle,
  stage_transition: Bell,
  new_patient: UserPlus,
  checklist_complete: ClipboardCheck,
};

const TYPE_COLORS: Record<string, string> = {
  sla_critical: "text-red-500",
  sla_warning: "text-amber-500",
  stage_transition: "text-blue-500",
  new_patient: "text-green-500",
  checklist_complete: "text-emerald-500",
};

function useRelativeTime(dateStr: string) {
  const t = useTranslations("notifications.time");
  return useMemo(() => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return t("justNow");
    if (diffMin < 60) return t("minutesAgo", { count: diffMin });
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return t("hoursAgo", { count: diffHrs });
    const diffDays = Math.floor(diffHrs / 24);
    return t("daysAgo", { count: diffDays });
  }, [dateStr, t]);
}

type NotificationItemProps = {
  notification: NotificationDto;
  onMarkRead: (id: string) => void;
};

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const isUnread = !notification.readAt;
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const iconColor = TYPE_COLORS[notification.type] ?? "text-muted-foreground";
  const relativeTime = useRelativeTime(notification.createdAt);
  const metadata = notification.metadata as Record<string, unknown> | null;
  const clientId = metadata?.clientId as string | undefined;

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
  };

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 transition-colors",
        isUnread ? "bg-accent/50" : "bg-transparent",
        "hover:bg-accent cursor-pointer",
      )}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      role="button"
      tabIndex={0}
    >
      <div className={cn("mt-0.5 shrink-0", iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", isUnread && "font-medium")}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
            {notification.body}
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-[11px]">{relativeTime}</p>
      </div>
      {isUnread && (
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  );

  if (clientId) {
    return (
      <Link href={`/dashboard/clients/${clientId}`} className="block" onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return content;
}
