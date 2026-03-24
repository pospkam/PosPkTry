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
    // ── 1. Warm up AI embeddings model ────────────────────────────────
    const { warmModel } = await import('@/lib/ai/embeddings');
    warmModel().catch(() => {
      // Best-effort; first request will trigger lazy load
    });

    // ── 2. Initialize Agent Platform ─────────────────────────────────
    try {
      const { initializeAgentPlatform } = await import('@/lib/agents/platform-init');
      await initializeAgentPlatform();
    } catch {
      // Non-blocking: agents won't run on schedule, but app continues
    }
  }
}
