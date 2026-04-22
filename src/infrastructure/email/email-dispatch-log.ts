import { createHash } from "node:crypto";

import type { EmailDispatchLogStatus, Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/database/prisma";

export function hashEmailForDispatchLog(to: string): string {
  return createHash("sha256").update(to.trim().toLowerCase(), "utf8").digest("hex");
}

export async function recordEmailDispatchSent(input: {
  tenantId: string;
  jobKind: string;
  to: string;
  resendMessageId: string;
}): Promise<void> {
  await prisma.emailDispatchLog.create({
    data: {
      tenantId: input.tenantId,
      jobKind: input.jobKind,
      recipientEmailHash: hashEmailForDispatchLog(input.to),
      resendMessageId: input.resendMessageId,
      status: "SENT",
    },
  });
}

function mapResendEventTypeToStatus(eventType: string): EmailDispatchLogStatus | null {
  switch (eventType) {
    case "email.sent":
      return "SENT";
    case "email.delivered":
      return "DELIVERED";
    case "email.bounced":
      return "BOUNCED";
    case "email.complained":
      return "COMPLAINED";
    case "email.opened":
      return "OPENED";
    case "email.failed":
      return "FAILED";
    default:
      return null;
  }
}

/**
 * Aplica evento verificado (Svix) do Resend. Ignora se o `resendMessageId` não estiver no log.
 */
export async function updateEmailDispatchLogFromResendEvent(input: {
  resendMessageId: string;
  eventType: string;
  lastEventAt: Date;
}): Promise<void> {
  const newStatus = mapResendEventTypeToStatus(input.eventType);
  const data: Prisma.EmailDispatchLogUpdateManyMutationInput = {
    lastResendEventType: input.eventType,
    lastResendEventAt: input.lastEventAt,
  };
  if (newStatus !== null) {
    data.status = newStatus;
  }
  await prisma.emailDispatchLog.updateMany({
    where: { resendMessageId: input.resendMessageId },
    data,
  });
}
