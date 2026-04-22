import { Queue } from "bullmq";

import { getRedisConnection } from "./redis-connection";
import { EMAIL_DISPATCH_QUEUE_NAME } from "./constants";

const globalForQueue = globalThis as unknown as { __emailDispatchQueue?: Queue };

export function getEmailDispatchQueue(): Queue | null {
  if (!globalForQueue.__emailDispatchQueue) {
    const connection = getRedisConnection();
    if (!connection) {
      return null;
    }
    globalForQueue.__emailDispatchQueue = new Queue(EMAIL_DISPATCH_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return globalForQueue.__emailDispatchQueue;
}
