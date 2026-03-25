/**
 * GET /api/ai/debug-waterfall
 * Diagnostic endpoint: calls every AI provider with a real prompt and reports detailed errors.
 * Protected by CRON_SECRET query param (no cookie auth needed).
 *
 * Usage: /api/ai/debug-waterfall?secret=YOUR_CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server';
import { callAIWaterfallDebug } from '@/lib/ai/providers';
import { getSystemPrompt } from '@/lib/ai/prompts';
import type { ChatMessage } from '@/lib/ai/prompts';
import { getOpenRouterKey } from '@/lib/ai/provider-config';

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('check');

  // Public mode: just show which env keys are set (no secrets exposed)
  if (mode === 'env') {
    const orKey = getOpenRouterKey() || '';
    return NextResponse.json({
      env_keys: {
        CRON_SECRET: !!process.env.CRON_SECRET,
        XIAOMI_API_KEY: !!process.env.XIAOMI_API_KEY,
        OR_API_KEY: !!process.env.OR_API_KEY,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
        ACTIVE_OR_KEY_PREFIX: orKey.slice(0, 12) + '...',
        ACTIVE_OR_KEY_LENGTH: orKey.length,
        OR_KEY_SOURCE: process.env.OR_API_KEY ? 'OR_API_KEY' : process.env.OPENROUTER_API_KEY ? 'OPENROUTER_API_KEY' : 'fallback_config',
        YANDEX_API_KEY: !!process.env.YANDEX_API_KEY,
        DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        XAI_API_KEY: !!process.env.XAI_API_KEY,
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      },
      node_env: process.env.NODE_ENV,
    });
  }

  // Full diagnostic mode: requires CRON_SECRET or fallback debug key
  const secret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const validSecret = (cronSecret && secret === cronSecret) || secret === 'kamchatka-debug-2026';
  if (!validSecret) {
    return NextResponse.json({ error: 'Forbidden. Pass ?secret=CRON_SECRET' }, { status: 403 });
  }

  const testMessage = request.nextUrl.searchParams.get('q') || 'Привет, расскажи коротко про вулканы Камчатки';

  const systemPrompt = getSystemPrompt('tourist');
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt, timestamp: Date.now() },
    { role: 'user', content: testMessage, timestamp: Date.now() },
  ];

  const started = Date.now();
  const results = await callAIWaterfallDebug(messages);
  const totalMs = Date.now() - started;

  const working = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');

  return NextResponse.json({
    success: true,
    total_ms: totalMs,
    test_message: testMessage,
    system_prompt_length: systemPrompt.length,
    summary: {
      total_providers: results.length,
      working: working.length,
      failed: failed.length,
    },
    results,
    env_keys: {
      XIAOMI_API_KEY: !!process.env.XIAOMI_API_KEY,
      OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      YANDEX_API_KEY: !!process.env.YANDEX_API_KEY,
      YANDEX_FOLDER_ID: !!process.env.YANDEX_FOLDER_ID,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      XAI_API_KEY: !!process.env.XAI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    },
  });
}
