import { NextRequest, NextResponse } from 'next/server'

// Для Timeweb Cloud Apps можно использовать nodejs runtime
// Edge runtime работает только на некоторых PaaS платформах
export const runtime = 'nodejs'

// async function callTimeweb(prompt: string) { ... } // Временно отключено TODO

async function callGroq(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b',
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
      model: 'anthropic/claude-3.5-sonnet',
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

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(async () => await req.json().catch(() => null))
    const prompt = typeof (body as any)?.prompt === 'string' ? (body as any).prompt : (typeof (body as any)?.input === 'string' ? (body as any).input : '')
    const q = String(prompt || '').slice(0, 800)
    if (!q) return NextResponse.json({ error: 'EMPTY' }, { status: 400 })

    // Приоритет: GROQ → DeepSeek → Minimax → xAI → OpenRouter (Timeweb AI временно отключен)
    let answer = await callGroq(q)
    if (!answer) answer = await callDeepseek(q)
    if (!answer) answer = await callMinimax(q)
    if (!answer) answer = await callXai(q)
    if (!answer) answer = await callOpenrouter(q)
    if (!answer) answer = 'Сейчас не могу ответить. Попробуйте позже.'

    // TODO: Включить Timeweb AI после исправления API
    // let answer = await callTimeweb(q)
    // if (!answer) answer = await callGroq(q)
    // if (!answer) answer = await callDeepseek(q)

    return NextResponse.json({ ok: true, answer })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'AI_FAILED' }, { status: 200 })
  }
}