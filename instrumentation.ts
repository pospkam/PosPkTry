/**
 * Next.js Instrumentation — app startup initialization
 *
 * On server startup, this performs:
 * 1. AI model warm-up (MiniLM embeddings)
 * 2. Agent platform initialization (scheduler, event bus)
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ── 0. Global safety net ───────────────────────────────────
    // Native modules in transformers/onnxruntime/sharp can throw during
    // lazy import on Alpine/musl. Do not let them kill the process and
    // fail Timeweb healthcheck — log and continue serving /api/health.
    process.on('unhandledRejection', (reason) => {
      console.error('[unhandledRejection]', reason);
    });
    process.on('uncaughtException', (err) => {
      console.error('[uncaughtException]', err);
    });

    // ── 1. Warm up AI embeddings model ────────────────────────────────
    // NOTE: disabled eager warm-up — @huggingface/transformers pulls sharp
    // which crashes container on startup in Timeweb Alpine image.
    // First search request will lazy-load the model instead.
    // try {
    //   const { warmModel } = await import('@/lib/ai/embeddings');
    //   warmModel().catch(() => {});
    // } catch { /* best-effort */ }

    // ── 2. Register MAX bot webhook ───────────────────────────────────
    const maxToken = process.env.MAX_BOT_TOKEN;
    if (maxToken) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tourhab.ru';
      const webhookUrl = `${baseUrl}/api/max/kuzmich`;
      try {
        // Check existing subscription first
        const checkRes = await fetch('https://platform-api.max.ru/subscriptions', {
          headers: { Authorization: maxToken },
        });
        const checkData = await checkRes.json() as { subscriptions?: Array<{ url: string }> };
        const alreadyRegistered = checkData.subscriptions?.some((s) => s.url === webhookUrl);
        if (!alreadyRegistered) {
          await fetch('https://platform-api.max.ru/subscriptions', {
            method: 'POST',
            headers: { Authorization: maxToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: webhookUrl,
              update_types: ['bot_started', 'message_created', 'message_callback'],
            }),
          });
        }
      } catch {
        // Non-blocking: webhook registration is best-effort
      }
    }
  }
}
