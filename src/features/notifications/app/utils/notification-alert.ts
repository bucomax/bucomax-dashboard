import type { NotificationDto } from "@/features/notifications/app/types";
import { resolveNotificationUrl } from "@/features/notifications/app/utils/notification-url";
import { toast } from "@/lib/toast";

export function alertUserOfNotification(notification: NotificationDto): void {
  const metadata = notification.metadata as Record<string, unknown> | null;
  const url = resolveNotificationUrl(notification.type, metadata);

  if (url) {
    toast(notification.title, {
      description: notification.body ?? undefined,
      action: {
        label: "Ver",
        onClick: () => {
          window.location.href = url;
        },
      },
    });
  } else {
    toast(notification.title, {
      description: notification.body ?? undefined,
    });
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }

  try {
    const browserNotification = new Notification(notification.title, {
      body: notification.body ?? undefined,
      icon: "/icon-192x192.png",
      tag: notification.id,
    });

    if (url) {
      browserNotification.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  } catch {
    // silent: browser may block notification
  }
}
