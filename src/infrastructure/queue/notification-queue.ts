import { Queue } from "bullmq";
import { getRedisConnection } from "./redis-connection";
import { NOTIFICATION_QUEUE_NAME } from "./constants";

const globalForQueue = globalThis as unknown as { __notifQueue?: Queue };

export function getNotificationQueue(): Queue {
  if (!globalForQueue.__notifQueue) {
    const connection = getRedisConnection();
    if (!connection) {
      throw new Error("Cannot create BullMQ queue: REDIS_URL is not configured.");
    }
    globalForQueue.__notifQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return globalForQueue.__notifQueue;
}
