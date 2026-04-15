import { Queue } from "bullmq";

import { getRedisConnection } from "./redis-connection";
import { WHATSAPP_DISPATCH_QUEUE_NAME } from "./constants";

const globalForQueue = globalThis as unknown as { __wppDispatchQueue?: Queue };

/**
 * BullMQ queue for WhatsApp document dispatch.
 * Returns `null` when Redis is unavailable — caller should fallback to inline dispatch.
 */
export function getWhatsAppDispatchQueue(): Queue | null {
  if (!globalForQueue.__wppDispatchQueue) {
    const connection = getRedisConnection();
    if (!connection) {
      return null;
    }
    globalForQueue.__wppDispatchQueue = new Queue(WHATSAPP_DISPATCH_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return globalForQueue.__wppDispatchQueue;
}
