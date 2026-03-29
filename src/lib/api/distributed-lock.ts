import { getRedisConnection } from "@/infrastructure/queue/redis-connection";

/**
 * Try to acquire a short-lived key in Redis (SET NX EX).
 * Returns true if the caller "won" the slot, false if another process already holds it.
 * When Redis is unavailable, always grants the lock (best-effort).
 */
export async function tryAcquire(key: string, ttlSec: number): Promise<boolean> {
  const redis = getRedisConnection();
  if (!redis) return true;

  try {
    const result = await redis.set(key, "1", "EX", ttlSec, "NX");
    return result === "OK";
  } catch {
    return true;
  }
}

/**
 * Explicitly release a lock.
 */
export async function releaseLock(key: string): Promise<void> {
  const redis = getRedisConnection();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch {
    /* silent */
  }
}
