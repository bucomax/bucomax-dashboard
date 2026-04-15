export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!process.env.REDIS_URL?.trim()) {
    console.log(
      "[instrumentation] REDIS_URL not set – running in inline mode (no BullMQ worker)"
    );
    return;
  }

  // BullMQ worker is long-running; Vercel serverless não mantém processo dedicado.
  // Use Redis na API (filas) e rode o worker em outro host, ou DISABLE_NOTIFICATION_WORKER=true.
  if (
    process.env.VERCEL === "1" ||
    process.env.DISABLE_NOTIFICATION_WORKER === "true"
  ) {
    console.log(
      "[instrumentation] BullMQ worker skipped (Vercel/serverless or DISABLE_NOTIFICATION_WORKER)."
    );
    return;
  }

  const { startNotificationWorker } = await import(
    "@/infrastructure/queue/notification-worker"
  );
  const worker = startNotificationWorker();
  if (worker) {
    console.log("[instrumentation] BullMQ notification worker started");
  }

  const { startWhatsAppDispatchWorker } = await import(
    "@/infrastructure/queue/whatsapp-dispatch-worker"
  );
  const wppWorker = startWhatsAppDispatchWorker();
  if (wppWorker) {
    console.log("[instrumentation] BullMQ WhatsApp dispatch worker started");
  }
}
