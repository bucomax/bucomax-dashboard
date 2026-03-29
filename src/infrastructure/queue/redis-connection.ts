import IORedis from "ioredis";

type ConnectionSlot = "default" | "worker" | "subscriber";

const globalConnections = globalThis as unknown as {
  __redisPool?: Map<ConnectionSlot, IORedis>;
};

/** Returns true when REDIS_URL is set (BullMQ, SSE pub/sub, rate limit, locks). */
export function isRedisEnabled(): boolean {
  return !!process.env.REDIS_URL;
}

function createConnection(): IORedis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 5_000),
  });
}

function getPool(): Map<ConnectionSlot, IORedis> {
  if (!globalConnections.__redisPool) {
    globalConnections.__redisPool = new Map();
  }
  return globalConnections.__redisPool;
}

function getOrCreate(slot: ConnectionSlot): IORedis {
  const pool = getPool();
  let conn = pool.get(slot);
  if (!conn) {
    conn = createConnection();
    pool.set(slot, conn);
  }
  return conn;
}

/** Queue producers (API side): non-blocking commands only. Returns null when Redis is disabled. */
export function getRedisConnection(): IORedis | null {
  if (!isRedisEnabled()) return null;
  return getOrCreate("default");
}

/** Worker consumers: uses blocking commands. Returns null when Redis is disabled. */
export function getWorkerRedisConnection(): IORedis | null {
  if (!isRedisEnabled()) return null;
  return getOrCreate("worker");
}

/** SSE subscriber connections are per-client. Returns null when Redis is disabled. */
export function createSubscriberConnection(): IORedis | null {
  if (!isRedisEnabled()) return null;
  return createConnection();
}
