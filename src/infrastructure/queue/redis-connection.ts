import IORedis from "ioredis";

type ConnectionSlot = "default" | "worker" | "subscriber";

const CIRCUIT_MS_DEFAULT = 45_000;

const globalConnections = globalThis as unknown as {
  __redisPool?: Map<ConnectionSlot, IORedis>;
  __redisCircuitUntil?: number;
  __notifQueue?: { close: () => Promise<void> };
};

/** Conexões `subscribe` fora do pool (SSE); desligadas no circuit breaker. */
const standaloneSubscribers = new Set<IORedis>();

/** Após falhas de conexão, deixa de criar clientes Redis por um tempo (evita spam de ECONNREFUSED). */
export function tripRedisCircuit(durationMs = CIRCUIT_MS_DEFAULT): void {
  globalConnections.__redisCircuitUntil = Date.now() + durationMs;

  const pool = globalConnections.__redisPool;
  if (pool) {
    for (const c of pool.values()) {
      try {
        c.disconnect(false);
      } catch {
        /* ignore */
      }
    }
    pool.clear();
  }

  for (const c of [...standaloneSubscribers]) {
    try {
      c.disconnect(false);
    } catch {
      /* ignore */
    }
  }
  standaloneSubscribers.clear();

  const q = globalConnections.__notifQueue;
  if (q) {
    void q.close().catch(() => {});
    delete globalConnections.__notifQueue;
  }
}

function isRedisCircuitOpen(): boolean {
  return Date.now() < (globalConnections.__redisCircuitUntil ?? 0);
}

/** Returns true when `REDIS_URL` is non-empty (BullMQ, SSE pub/sub, rate limit, locks). */
export function isRedisEnabled(): boolean {
  return !!process.env.REDIS_URL?.trim();
}

function createConnection(): IORedis {
  const url = process.env.REDIS_URL!.trim();
  const conn = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5_000,
    retryStrategy(times) {
      const cap = 8;
      if (times > cap) {
        console.warn(
          "[redis] Desistindo da reconexão após %s tentativas. Suba o Redis (`docker compose up -d redis`), defina `REDIS_URL`, ou remova/limpe `REDIS_URL` no `.env` para modo inline.",
          cap,
        );
        tripRedisCircuit();
        return null;
      }
      return Math.min(times * 400, 4_000);
    },
  });
  conn.on("error", () => {
    /* Evita "Unhandled error event" do ioredis com enableOfflineQueue: false; reconexão via retryStrategy. */
  });
  return conn;
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

/** Queue producers (API side): non-blocking commands only. Returns null when Redis is disabled or circuit is open. */
export function getRedisConnection(): IORedis | null {
  if (!isRedisEnabled() || isRedisCircuitOpen()) return null;
  return getOrCreate("default");
}

/** Worker consumers: uses blocking commands. Returns null when Redis is disabled or circuit is open. */
export function getWorkerRedisConnection(): IORedis | null {
  if (!isRedisEnabled() || isRedisCircuitOpen()) return null;
  return getOrCreate("worker");
}

/** SSE subscriber connections are per-client. Returns null when Redis is disabled or circuit is open. */
export function createSubscriberConnection(): IORedis | null {
  if (!isRedisEnabled() || isRedisCircuitOpen()) return null;
  const conn = createConnection();
  standaloneSubscribers.add(conn);
  conn.once("end", () => standaloneSubscribers.delete(conn));
  return conn;
}
