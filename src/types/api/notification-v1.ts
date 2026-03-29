import type { NotificationType } from "@prisma/client";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsListResponseData = {
  data: NotificationDto[];
  nextCursor: string | null;
};

export type UnreadCountResponseData = {
  count: number;
};

export type MarkReadResponseData = {
  notification: NotificationDto;
};

export type MarkAllReadResponseData = {
  updated: number;
};
