import { Queue } from "bullmq";
import { getRedisConnection } from "./redis-connection";
import { NOTIFICATION_QUEUE_NAME } from "./constants";

const globalForQueue = globalThis as unknown as { __notifQueue?: Queue };

/**
 * Fila BullMQ ou `null` quando não há Redis utilizável (`REDIS_URL` vazio, circuito aberto
 * após falha de conexão, etc.). Não lança — o emissor grava inline nesses casos.
 */
export function getNotificationQueue(): Queue | null {
  if (!globalForQueue.__notifQueue) {
    const connection = getRedisConnection();
    if (!connection) {
      return null;
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
