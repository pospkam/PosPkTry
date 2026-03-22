/**
 * Next.js Instrumentation — прогрев модели MiniLM при старте сервера.
 * Модель загружается в фоне (non-blocking), первый запрос поиска будет быстрым.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid loading @huggingface/transformers on edge runtime
    const { warmModel } = await import('@/lib/ai/embeddings');
    warmModel().catch(() => {
      // Model warm-up is best-effort; first request will trigger lazy load
    });
  }
}
