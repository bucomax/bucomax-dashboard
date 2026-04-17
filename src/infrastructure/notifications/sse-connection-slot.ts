import {
  createSubscriberConnection,
  getRedisConnection,
  isRedisEnabled,
  tripRedisCircuit,
} from "@/infrastructure/queue/redis-connection";
const MAX_SSE_PER_USER = 3;
const SSE_COUNTER_TTL = 3600;

export type SseSlotResult = "ok" | "limit" | "redis_unavailable";

export async function acquireSseSlot(userId: string): Promise<SseSlotResult> {
  const redis = getRedisConnection();
  if (!redis) return "redis_unavailable";
  const key = `sse:conn:${userId}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, SSE_COUNTER_TTL);
    if (current > MAX_SSE_PER_USER) {
      await redis.decr(key);
      return "limit";
    }
    return "ok";
  } catch {
    tripRedisCircuit();
    return "redis_unavailable";
  }
}

export async function releaseSseSlot(userId: string): Promise<void> {
  const redis = getRedisConnection();
  if (!redis) return;
  const key = `sse:conn:${userId}`;
  try {
    const val = await redis.decr(key);
    if (val <= 0) await redis.del(key);
  } catch {
    /* Redis caiu durante o stream; slot expira pelo TTL */
  }
}

export { createSubscriberConnection, isRedisEnabled, tripRedisCircuit };
