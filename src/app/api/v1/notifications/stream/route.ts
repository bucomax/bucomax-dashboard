import { getApiT } from "@/lib/api/i18n";
import { getActiveTenantIdOr400, requireSessionOr401 } from "@/lib/auth/guards";
import { prisma } from "@/infrastructure/database/prisma";
import { SSE_NOTIFICATIONS_CHANNEL } from "@/infrastructure/queue/constants";
import {
  createSubscriberConnection,
  getRedisConnection,
  isRedisEnabled,
} from "@/infrastructure/queue/redis-connection";
import type IORedis from "ioredis";

export const dynamic = "force-dynamic";

const MAX_SSE_PER_USER = 3;
const SSE_COUNTER_TTL = 3600;

async function acquireSseSlot(userId: string): Promise<boolean> {
  const redis = getRedisConnection();
  if (!redis) return false;
  const key = `sse:conn:${userId}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, SSE_COUNTER_TTL);
  if (current > MAX_SSE_PER_USER) {
    await redis.decr(key);
    return false;
  }
  return true;
}

async function releaseSseSlot(userId: string): Promise<void> {
  const redis = getRedisConnection();
  if (!redis) return;
  const key = `sse:conn:${userId}`;
  const val = await redis.decr(key);
  if (val <= 0) await redis.del(key);
}

export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const userId = auth.session!.user.id;
  const tenantId = tenantCtx.tenantId;

  if (!isRedisEnabled()) {
    return Response.json(
      { success: false, error: { code: "SSE_UNAVAILABLE", message: "Real-time stream requires Redis." } },
      { status: 501 },
    );
  }

  const allowed = await acquireSseSlot(userId);
  if (!allowed) {
    return Response.json(
      { success: false, error: { code: "SSE_LIMIT", message: "Too many open connections." } },
      { status: 429 },
    );
  }

  const encoder = new TextEncoder();
  let subscriber: IORedis | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let slotReleased = false;

  function cleanup() {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    if (subscriber) {
      subscriber.unsubscribe(SSE_NOTIFICATIONS_CHANNEL).catch(() => {});
      subscriber.disconnect();
      subscriber = null;
    }
    if (!slotReleased) {
      slotReleased = true;
      void releaseSseSlot(userId);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      }

      const initialCount = await prisma.notification.count({
        where: { userId, tenantId, readAt: null },
      });
      send("unread-count", { count: initialCount });

      subscriber = createSubscriberConnection();
      if (!subscriber) {
        cleanup();
        controller.close();
        return;
      }

      await subscriber.subscribe(SSE_NOTIFICATIONS_CHANNEL);

      subscriber.on("message", (_channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message) as {
            userId: string;
            tenantId: string;
            notification: Record<string, unknown>;
          };
          if (parsed.userId === userId && parsed.tenantId === tenantId) {
            send("notification", parsed.notification);
          }
        } catch {
          /* malformed */
        }
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, 30_000);
    },

    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
