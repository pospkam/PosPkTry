/**
 * GET /api/ai/debug-waterfall
 * Diagnostic endpoint: calls every AI provider with a real prompt and reports detailed errors.
 * Admin-only (requireAdmin).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { callAIWaterfallDebug } from '@/lib/ai/providers';
import { getSystemPrompt } from '@/lib/ai/prompts';
import type { ChatMessage } from '@/lib/ai/prompts';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const testMessage = request.nextUrl.searchParams.get('q') || 'Привет, расскажи про вулканы Камчатки';

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
