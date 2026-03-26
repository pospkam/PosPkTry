import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter, getClientIp } from '@/lib/rate-limit'

// Для Timeweb Cloud Apps можно использовать nodejs runtime
// Edge runtime работает только на некоторых PaaS платформах
export const runtime = 'nodejs'

const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 20 })

// async function callTimeweb(prompt: string) { ... } // Временно отключено TODO

async function callDeepseek(prompt: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return null
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: 'system', content: 'Кратко и по делу. Я туристический ассистент Камчатки.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!r.ok) return null
  const data = await r.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return content
}

async function callMinimax(prompt: string) {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return null
  const r = await fetch('https://api.minimax.chat/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'abab6.5s-chat',
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: 'system', content: 'Кратко и по делу. Я туристический ассистент Камчатки.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!r.ok) return null
  const data = await r.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return content
}

async function callXai(prompt: string) {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) return null
  const r = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: 'system', content: 'Кратко и по делу. Я туристический ассистент Камчатки.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!r.ok) return null
  const data = await r.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return content
}

async function callOpenrouter(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-6',
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: 'system', content: 'Кратко и по делу. Я туристический ассистент Камчатки.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!r.ok) return null
  const data = await r.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return content
}

// AUTH: Public — AI assistant for visitors
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  if (!aiLimiter.check(ip)) {
    return NextResponse.json({ ok: false, error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 })
  }

  try {
    const body: unknown = await req.formData().catch(async () => await req.json().catch(() => null));
    const parsed = body as Record<string, unknown> | null;
    const raw = parsed?.prompt ?? parsed?.input ?? '';
    const q = String(raw).slice(0, 800);
    if (!q) return NextResponse.json({ error: 'EMPTY' }, { status: 400 })

    // Приоритет: DeepSeek → Minimax → xAI → OpenRouter
    let answer = await callDeepseek(q)
    if (!answer) answer = await callMinimax(q)
    if (!answer) answer = await callXai(q)
    if (!answer) answer = await callOpenrouter(q)
    if (!answer) answer = 'Сейчас не могу ответить. Попробуйте позже.'

    return NextResponse.json({ ok: true, answer })
  } catch {
    return NextResponse.json({ ok: false, error: 'AI_FAILED' }, { status: 500 })
  }
}